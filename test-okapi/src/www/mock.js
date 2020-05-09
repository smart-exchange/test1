/*
* todo
* 1.参数可调
* 2.上升趋势模拟
* 3.下降趋势模拟
* 4.获取真实数据模拟
* 5.上升趋势检测
* 6.下降趋势检测
* 7.上升趋势策略
* 8.下降趋势策略
* */
/*
* 模拟数字货币高卖低卖
* 只适合震荡中的行情
* 如果出现下跌、上涨行情，此策略不会交易
* */
//账户基本信息，交易结果
const accountInfo = {
  name: "Test1",//账户名字
  initFound: 100000,//初始资金，开始等于全部资金
  found: 100000,//全部资金
  price: 10,//当前数字货币价格，随便假设一个数，在交易过程中会实时变化
  fee: 0,//手续费，开始没有交易为 0
  times: 0,//交易次数，没有没有交易为 0
  cCount: 0,//当前持仓（数字货币个数），开始没有交易
  foundHistory: [],//资金历史信息，开始无
};
//刷新价格次数,生产模拟价格个数
let refreshTimes = 200;
//交易手续费 0.01% 默认
let feeRate = 0.0001;
//第一手交易数量
let fHand = 5;
//波动中的中间价位（用于产生标的价格）
let basicPrice = 8500;
//震荡强度（波峰，用于产生标的价格）
let waveTop = 1000;
//震荡强度（波谷，用于产生标的价格）
let waveBottom = 1000;
//交易的梯度，每次价格间隔交易添加，与交易策略有关
let exchangeGrad = 1;
//产生模拟的货币价格
// let priceHistory = priceProductor(refreshTimes, getPrice, [basicPrice, waveTop, waveBottom]);
// 模拟交易
// init(accountInfo, strategy2, priceHistory,exchangeAfter);

/*
* 策略2
* 距离中间基准价越大交易越大
* 个数 -- 价格
* +5000  5
* +4000  6
* +3000  7
* +2000  8
* +1000  9
* 首次 +5000  basicPrice  以一个中间价位买入
* -1000 11
* -2000 12
* -3000 13
* -4000 14
* -5000 15
* accountInfo 账户信息
* priceInfo 价格
* */
//距离中间基准价越大交易越大
function strategy2(accountInfo, priceInfo) {
  let p = parseFloat(priceInfo.price);
  let c = exchangeGrad;
  if (accountInfo.cCount === 0) {
    if (p <= basicPrice * (1 + 0.05) && p >= basicPrice * (1 - 0.05) ) {
      /*
      * 当价格为 判定的基础价格左右 的时候 购买第一手
      * 不然在真实场景中，很难刚好有买入点
      * */
      accountInfo.cCount = fHand;
      accountInfo.found -= fHand * p;
      accountInfo.fee += (fHand * p * feeRate);
      accountInfo.times++;
    }
  } else if (accountInfo.cCount >= fHand) {
    /*
    * 一旦购买，就只等价格高于基础价格卖出
    * 如果出现下跌行情(下跌超过波动区间)，则只套牢 < (第一手 + 梯度交易的第二手)
    * 如果出现上涨行情(上涨超过波动区间)，则最多会获利第一手的空间
    * */
    if (p > basicPrice) {
      c = (p - basicPrice) * c;
      if (accountInfo.cCount >= c) {
        accountInfo.cCount -= c;
        accountInfo.found += (c * p);
        accountInfo.fee += (fHand * p * feeRate);
        accountInfo.times++;
      }
    }
  } else if (accountInfo.cCount < fHand) {
    /*
    * 只有当价格第一判断的基础价格 且 仓位小于第一手，才买入，保证下跌行情不会被套太多
    * 继续下跌：最多套牢 < (第一手 + 梯度交易的第二手)
    * 上涨：就会卖出
    * */
    if (p < basicPrice) {
      c = (basicPrice - p) * c;
      accountInfo.cCount += c;
      accountInfo.found -= (c * p);
      accountInfo.fee += (fHand * p * feeRate);
      accountInfo.times++;
    }
  }
  //价格
  accountInfo.price = p;
  accountInfo.foundHistory.push({
    found: getFound(accountInfo),
    time: priceInfo.time
  });
}

/*
* 交易
* @params accountInfo 账户
* @params strategy 策略
* @params exchangeAfter 交易结束
* @params priceHistory 价格数据
* */
function init(accountInfo,strategy, priceHistory,exchangeAfter) {
  priceHistory.map((priceInfo) => {
    strategy(accountInfo, priceInfo);
    // console.log("交易价格:" + priceInfo.price);
    // console.log("交易中资金信息:" + JSON.stringify(accountInfo));
  });
  // 结束交易
  exchangeAfter && exchangeAfter();
}

/*
* 产生随机价格
* 模拟数字货币价格波动
* 基于 basicPrice 上下波动
* basicPrice 基线
* waveTop 波峰距离
* waveBottom 波谷距离
* */
function getPrice(basicPrice, waveTop, waveBottom) {
  let price = 0;
  if (Math.random() > 0.5) {
    price = basicPrice - (parseInt((Math.random() + 0.01) * 10)) * waveBottom / 10;
  } else {
    price = basicPrice + (parseInt((Math.random() + 0.01) * 10)) * waveTop / 10;
  }
  return price + ""
}


/*
* length 产生模拟数据个数
* getPrice 产生价格函数
* paramArr 产生价格的参数
* */
function priceProductor(length, getPrice, paramArr) {
  let arr = [];
  for (let i = 0; i < length; i++) {
    arr.push({
      price: getPrice(...paramArr),
      time: (new Date()).getMinutes() + ":" + i
    });
  }
  return arr;
}

/*
* 计算资金
* accountInfo 账户信息
* */
function getFound(accountInfo) {
  return accountInfo.found + accountInfo.cCount * accountInfo.price;
}

/*
* 交易最终结果
* */
function exchangeAfter() {
  console.log("---------------------------");
  console.log("-------- 交易行情 --------");
  console.log("价格波动范围 : " + (basicPrice - waveBottom) + "--" + (basicPrice + waveTop));
  console.log("判断的中间买入价 : " + (basicPrice));
  console.log("-------- 交易结果 --------");
  console.log("交易次数 : " + accountInfo.times);
  let m = accountInfo.found + accountInfo.cCount * accountInfo.price;
  console.log("交易剩余资金(元) : " + m);
  console.log("初始资金(元) : " + accountInfo.initFound);
  console.log("获利(元) : " + (m - accountInfo.initFound));
  console.log("手续费(元) : " + (accountInfo.fee));
  console.log("---------------------------");
};










