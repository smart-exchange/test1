const {AuthenticatedClient} = require('@okfe/okex-node');
var config = require('../config/config-jiaoyi');
const authClient = new AuthenticatedClient(config.httpkey, config.httpsecret, config.passphrase, config.urlHost);

/*
* 交易策略-核心程序
* 距离中间基准价越大交易越大
* 此策略主要适合波动行情小时段
* todo
* 需要检查每次交易必须大于手续费
* 真实下单、撤单
* 长期在基准线下，是否要做空
* 下单检测爆仓率
* */
function strategy(options) {
  // todo 实时获取装好
  // const accountInfo = account.getAccount();
  //账户信息
  let accountInfo = options.accountInfo;
  //标的价格信息
  let priceInfo = options.priceInfo;
  let p = parseFloat(priceInfo.price);
  //波动基准价
  let basicPrice = options.basicPrice;
  //交易的梯度，离基准价越近，
  let c = options.exchangeGrad;
  //价格波动百分比，越大交易级别就愈大
  let gardRate = options.gardRate || 0.004;
  //第一手买入的数量
  let fHand = options.fHand;
  //每一单最小交易量，小于则不交易
  let minExchange = options.minExchange;
  //手续费费率
  let feeRate = options.feeRate || 0.001;
  //第一手交易的价格低于基准价的百分数，如果为负数就会高于基准价买入,默认 0.01
  let fHandRate = options.fHandRate || 0.01;
  //最大年化收益率百分比，达到了就停止交易，默认 100 %
  let maxYearRate = options.maxYearRate || 100;
  //最大仓位，默认 50%，大于这个仓位就不交易
  let maxExchangeRate = options.maxExchangeRate || 0.5;
  //（基于基准价）拒绝交易的买入波动，行情可能跳水，不要买入
  let rejectGardRateIn = options.rejectGardRateIn || 0.04;
  //（基于基准价）拒绝交易的卖出波动，行情上涨厉害，不卖出
  let rejectGardRateOut = options.rejectGardRateOut || 0.06;
  // 爆仓价率，如果 爆仓价/当前价 >= burstRate 就不下单
  let burstRate = options.burstRate || 0.5;
  //级别对应的价格
  options.accountInfo.gradPrice = calGradPrice( options.basicPrice,gardRate);
  //年化收益要实时计算
  claFoundInfo(accountInfo, p, priceInfo);
  
  //已经不在交易状态
  if (accountInfo.status === 0) {
    console.log(accountInfo.resason + "，停止了交易");
    return;
  }
  //达到目标，停止交易
  if (accountInfo.getYearRate > maxYearRate && p > basicPrice && accountInfo.cCount > 0) {
    //平仓
    console.log("年化收益达到最大值：" + maxYearRate + "，平仓, 停止交易");
    c = accountInfo.cCount;
    accountInfo.cCount -= c;
    accountInfo.found += (c * p);
    accountInfo.fee += (c * p * feeRate);
    accountInfo.times++;
    accountInfo.exchangeHistory.push({
      grad: "end",//交易的波动层级，买入 1 -> 5，卖出 -1 -> -5
      size: c,
      type: "卖出",
      price: p,
      getYearRate: accountInfo.getYearRate,
      fee: accountInfo.fee,
      cCount: accountInfo.cCount,
      time: priceInfo.time,
    });
    accountInfo.status = 0;
    accountInfo.resason = "年化收益达到最大值";
    claFoundInfo(accountInfo, p, priceInfo);
    return;
  }
  //交易第一手
  if (accountInfo.cCount === 0) {
    if (isPassMaxExchangeRate(fHand, p, accountInfo, maxExchangeRate)) {
      console.log("超过最大仓位，不能交易，请重新设置第一手交易量");
      return;
    }
    if (p <= basicPrice * (1 - fHandRate)) {
      /*
      * 第一手买入价自己设定，一般要低于基准价买入
      * 这一单是可能被套的，如果行情直接下跌，不高于基准价，就无法卖出了
      * */
      while ((fHand * p) > accountInfo.found) {
        //手上的钱不够买入,就少买入点
        fHand -= 10;
      }
      if (c < minExchange) {
        //少于最小交易量
        console.log("小于最小交易量，无法交易");
        return;
      }
      //todo
      //这些都是需要调接口成功之后才能操作账户，重新请求账户信息，由交易所变更账户信息
      accountInfo.cCount = fHand;
      accountInfo.found -= fHand * p;
      accountInfo.fee += (fHand * p * feeRate);
      accountInfo.times++;
      accountInfo.exchangeHistory.push({
        grad: 0,// 只有第一手才是 0
        size: fHand,
        type: "买入",
        price: p,
        getYearRate: accountInfo.getYearRate,
        fee: accountInfo.fee,
        cCount: accountInfo.cCount,
        time: priceInfo.time,
      });
      console.log("买入" + fHand);
    }
    if (p > basicPrice * (1 - fHandRate)) {
      /*
      * 第一手也可以做空
      * todo
      * 加入做空后续逻辑变得不一样，需要调整
      * */
    }
    claFoundInfo(accountInfo, p, priceInfo);
  }
  //平多
  if (p > basicPrice && accountInfo.cCount > 0) {
    /*
    * 一旦购买，就只等价格高于基础价格卖出
    * 如果出现下跌行情(下跌超过波动区间)，则只套牢 < (第一手 + 梯度交易的第二手)
    * 如果出现上涨行情(上涨超过波动区间)，则最多会获利第一手的空间
    * */
    let nastChange = accountInfo.exchangeHistory[accountInfo.exchangeHistory.length - 1];
    let grad = getGrad(basicPrice, p, gardRate);
    if (grad === 0) {
      //波动太小，不交易
      return;
    }
    c = grad * c;
    if (grad > 5) {
      c = 5 * c;
    }
    if (grad > (rejectGardRateOut / gardRate)) {
      console.log("上涨太多，不交易");
      return;
    }
    while (accountInfo.cCount < c) {
      //手上的数量不够卖出,需要平单数量
      c -= 10;
    }
    if (c < minExchange) {
      console.log("小于最小交易量，无法交易");
      return;
    }
    if (grad <= (-nastChange.grad)) {
      /*
      * 当前的交易级别，也不能与上一次交易级别一样
      * 如果级别老是一样，会导致在基准线附近交易，不会到波峰与波谷
      * */
      console.log("交易级小于等于上一次，不交易");
      return;
    }
    
    //todo
    //这些都是需要调接口成功之后才能操作账户，重新请求账户信息，由交易所变更账户信息
    accountInfo.cCount -= c;
    accountInfo.found += (c * p);
    accountInfo.fee += (c * p * feeRate);
    accountInfo.times++;
    accountInfo.exchangeHistory.push({
      nastGrad: nastChange.grad,
      grad: -grad,//交易的波动层级，买入 1 -> 5，卖出 -1 -> -5
      size: c,
      type: "卖出",
      price: p,
      getYearRate: accountInfo.getYearRate,
      fee: accountInfo.fee,
      cCount: accountInfo.cCount,
      time: priceInfo.time,
    });
    console.log("卖出" + c);
    claFoundInfo(accountInfo, p, priceInfo);
    
  }
  //开多
  if (p < basicPrice && accountInfo.exchangeHistory.length > 0) {
    /*
    * 只有当价格第一判断的基础价格 且 仓位小于第一手，才买入，保证下跌行情不会被套太多
    * 继续下跌：最多套牢 < (第一手 + 梯度交易的第二手)
    * 上涨：就会卖出
    * */
    let nastChange = accountInfo.exchangeHistory[accountInfo.exchangeHistory.length - 1];
    let grad = getGrad(basicPrice, p, gardRate);
    if (grad === 0) {
      //波动太小，不交易
      return;
    }
    c = grad * c;
    if (grad > 5) {
      /*
      * 可能严重跳水
      * */
      c = 5 * c;
    }
    if (grad > (rejectGardRateIn / gardRate)) {
      console.log("跳水太严重，不交易");
      return;
    }
    while ((c * p) > accountInfo.found) {
      //手上的钱不够买入,需要减少买入数量
      c -= 10;
    }
    if (c < minExchange) {
      //少于最小交易量
      console.log("小于最小交易量，无法交易");
      return;
    }
    if (nastChange.grad === 0) {
      console.log("第一手还没卖出，不能买入");
      //以免价格一直低于基准价
      return;
    }
    if (grad <= nastChange.grad) {
      /*
      * 当前的交易级别，也不能与上一次交易级别一样
      * 如果级别老是一样，会导致在基准线附近交易，不会到波峰与波谷
      * */
      console.log("交易级小于等于上一次，不交易");
      return;
    }
    if ((grad - nastChange.grad) >= 3 ) {
    // && nastChange.grad > 0
      /*
      * 一下波动3个级别以上
      *
      * */
      /*
      * 连续交易的了七小时，发现前两个交易级别为1，2，当前持仓0，价格降低级别为-1，结果没有买入。
      * todo
      * 仔细思考，这个地方并非bug，当行情上涨就不断推高基准线，越低的价格就不不买入
      * */
      console.log("严重下跌，不做买入交易");
      return;
    }
    
    if (isPassMaxExchangeRate(c, p, accountInfo, maxExchangeRate)) {
      console.log("超过最大仓位，不能交易，请重新设置第一手交易量");
      return;
    }
    //todo
    //这些都是需要调接口成功之后才能操作账户，重新请求账户信息，由交易所变更账户信息
    accountInfo.cCount += c;
    accountInfo.found -= (c * p);
    accountInfo.fee += (c * p * feeRate);
    accountInfo.times++;
    accountInfo.exchangeHistory.push({
      nastGrad: nastChange.grad,
      grad: grad,//交易的波动层级，买入 1 -> 5，卖出 -1 -> -5
      size: c,
      type: "买入",
      price: p,
      getYearRate: accountInfo.getYearRate,
      fee: accountInfo.fee,
      cCount: accountInfo.cCount,
      time: priceInfo.time,
    });
    console.log("买入" + c);
    claFoundInfo(accountInfo, p, priceInfo);
    
  }
}

/*
* 计算资金信息
* 每次成功交易之后计算
* */
function claFoundInfo(accountInfo, p, priceInfo) {
  //实时价格
  accountInfo.price = p;
  //总总获利
  accountInfo.getMoney = getFound(accountInfo) - accountInfo.initFound;
  //年化收益率
  accountInfo.getYearRate = (parseInt((accountInfo.getMoney / accountInfo.initFound) * 10000) * (365 * 100) / 10000);
  //资金历史
  accountInfo.foundHistory.push({
    found: getFound(accountInfo),
    time: priceInfo.time,
    getYearRate: accountInfo.getYearRate
  });
  
}

/*
* 计算资金
* accountInfo 账户信息
* */
function getFound(accountInfo) {
  return accountInfo.found + accountInfo.cCount * accountInfo.price;
}

/*
* 计算波动级别
* 距离基准价波动(可以设定) gardRate 算一级，波动越大，级别越大
* 返回 1--5 个级别，每一个级别波动添加 0.004
* 开单，平单，都是需要这个级别，级别越大，开、平数量越大
* */
function getGrad(basicPrice, price, gardRate) {
  let gard = gardRate;
  let g = 0;
  if (basicPrice === price) {
    return 0;
  }
  if (basicPrice > price) {
    g = (basicPrice - price) / basicPrice;
  } else {
    g = (price - basicPrice) / basicPrice;
  }
  if (g < gard) {
    return 0;
  }
  if (g >= gard && g <= gard * 2) {
    return 1;
  }
  if (g > gard * 2 && g <= gard * 3) {
    return 2;
  }
  if (g > gard * 3 && g <= gard * 4) {
    return 3;
  }
  if (g > gard * 4 && g <= gard * 5) {
    return 4;
  }
  if (g > gard * 5 && g <= gard * 6) {
    return 5;
  }
  return parseInt(g / gard);
}

/*
* 检测交易会不会导致仓位过大
* cCount 继续买入的
* price 价格
* */
function isPassMaxExchangeRate(cCount, price, accountInfo, maxExchangeRate) {
  let allCount = cCount + accountInfo.cCount;//总数
  let eRate = (allCount * price) / accountInfo.initFound;
  return eRate > maxExchangeRate;
}

/*
* 计算交易级别，对应的价格
* */
function calGradPrice(basicPrice, gardRate) {
  let gArr = [];
  for(let i=-5; i<=5; i++){
    gArr.push((basicPrice*(1+gardRate*i)).toFixed(4));
  }
  return gArr;
}
/*
* 开多前，确认一下信息
* */
function orderInBefore() {
  //如果临近爆仓价 80% 则不要交易

}
/*
* 危险动作，需要处理好信息
* 开多
* */
function orderIn() {
// 下单
// 这个接口权限需要可写
  let postOrderParams = {
// client_oid 识别订单的标志，可以不传, 这个可以用来撤销订单,也可以用返回的 order_id 来撤销订单
// 值得注意的是，
// 多个订单的 client_oid 一致，撤销的时候，如果传入 client_oid ，那么只会一个一个撤销，撤销顺序 先下单后撤销，撤销最近的一次下单
    "client_oid": "test1",
    "size": "1",//下单数量
    "order_type": 0,
// order_type
// 0：普通委托（order_type不填或填0都是普通委托）
// 1：只做Maker（Post only）
// 2：全部成交或立即取消（FOK）
// 3：立即成交并取消剩余（IOC）
    "type": "1",	//可填参数：1:开多 2:开空 3:平多 4:平空
    "match_price": "0",
// match_price 是否以对手价下单。
// 0:不是; 1:是。当以对手价下单，order_type只能选择0（普通委托）
    "price": "1",// 委托价格
// 合约名称，如BTC-USD-SWAP,BTC-USDT-SWAP
    "instrument_id": "EOS-USD-SWAP"
  };
// authClient.swap().postOrder(postOrderParams).then(res => console.log(JSON.stringify(res)));
  
  //挂单不交易，一定时间里面需要撤单，不然资金受影响
// 撤销订单
// authClient.swap().postCancelOrder("EOS-USD-SWAP", "test1").then(res => console.log(JSON.stringify(res)));

}
/*
* 平多前，确认一下信息
* */
function orderOutBefore() {

}
/*
* 平多
* */
function orderOut() {

// 下单
// 这个接口权限需要可写
  let postOrderParams = {
// client_oid 识别订单的标志，可以不传, 这个可以用来撤销订单,也可以用返回的 order_id 来撤销订单
// 值得注意的是，
// 多个订单的 client_oid 一致，撤销的时候，如果传入 client_oid ，那么只会一个一个撤销，撤销顺序 先下单后撤销，撤销最近的一次下单
    "client_oid": "test1",
    "size": "1",//下单数量
    "order_type": 0,
// order_type
// 0：普通委托（order_type不填或填0都是普通委托）
// 1：只做Maker（Post only）
// 2：全部成交或立即取消（FOK）
// 3：立即成交并取消剩余（IOC）
    "type": "1",	//可填参数：1:开多 2:开空 3:平多 4:平空
    "match_price": "0",
// match_price 是否以对手价下单。
// 0:不是; 1:是。当以对手价下单，order_type只能选择0（普通委托）
    "price": "1",// 委托价格
// 合约名称，如BTC-USD-SWAP,BTC-USDT-SWAP
    "instrument_id": "EOS-USD-SWAP"
  };
// authClient.swap().postOrder(postOrderParams).then(res => console.log(JSON.stringify(res)));
  //挂单不交易，一定时间里面需要撤单，不然资金受影响
// 撤销订单
// authClient.swap().postCancelOrder("EOS-USD-SWAP", "test1").then(res => console.log(JSON.stringify(res)));

}

// 账单流水查询
// authClient.swap().getLedger("EOS-USD-SWAP").then(res => console.log(JSON.stringify(res)));

//所有合约/单个合约持仓信息
//计算爆仓价，可以平数量
// authClient.swap().getPosition("EOS-USD-SWAP").then(res => {
//   console.log(JSON.stringify(res))
//   let holdingArr = res.holding;
//   let first = holdingArr[0];
//   console.log("强平价" + first.liquidation_price);
//   console.log("开仓平均价" + first.avg_cost);
//   console.log("持仓数量" + first.position);
//   console.log("可平数量" + first.avail_position);
//   console.log("最新成交价" + first.last);
// });

// 获取所有订单列表
// 判断是否存在挂单
// 根据 订单状态 state 查询
// -2:失败
// -1:撤单成功
// 0:等待成交
// 1:部分成交
// 2:完全成交
// 3:下单中
// 4:撤单中
// 6: 未完成（等待成交+部分成交）
// 7:已完成（撤单成功+完全成交）
// authClient.swap().getOrders("EOS-USD-SWAP",{
//   state:6,//
//   limit:100,//最多100
// }).then(res => console.log(JSON.stringify(res)));
//获取订单信息
// authClient.swap().getOrder("EOS-USD-SWAP", '429571669055197184').then(res => console.log(JSON.stringify(res)));

module.exports.strategy = strategy;
