// 获取k线数据
//iso +8 小时 为中国时间
// todo 无法获取分钟级别行情 已经提交问题反馈
// pClient.swap().getCandles(ins_id, {
//   start: "2020-02-09T16:00:00.000Z",
//   end: "2020-02-10T16:00:00.000Z",
//   granularity: "60"
// }).then(res=>{
//   console.log(res)
// });
//获取当前的交易信息
// pClient.swap().getTicker(ins_id).then(res=>{
//   console.log(res)
// });
/*
* 开始获取行情数据并且交易
* strategy 交易策略
* strategyOptions 交易策略参数
* */
/*
* 波动策略缺点
* 1.连续上涨也只会赚一手
* 2.下跌会套牢一手
* 3.基准线预测不准确
* 4.交易频次高导致手续费高
* 5.测试数次平均的年化收益不过15%
* 6.属于震荡行情，多数时间段不是上涨就是下跌
* 7.跑几个小时又要重新设置基准线，麻烦，不利于长期跑
*
* 以后的计划
* 改为分钟级别
* */
const {PublicClient,AuthenticatedClient} = require('@okfe/okex-node');
const config = require('./config/config-jiaoyi');
const pClient = new PublicClient(config.urlHost, 30000);
const aClient = new AuthenticatedClient(config.httpkey, config.httpsecret, config.passphrase, config.urlHost);
const Koa = require('koa');
const static = require('koa-static');
const Router = require('koa-router'); // koa 路由中间件
const strategy = require("./eos/strategy");
const dataNoter = require("./eos/dataNoter");
const ticker = require("./eos/ticker");
const account = require("./eos/account");
const cors = require('koa2-cors');
const router = new Router(); // 实例化路由
const app = new Koa();
let port = 3009;
// 配置静态web服务的中间件
app.use(static(__dirname+'/www'));
// 具体参数我们在后面进行解释
app.use(cors({
  origin: function (ctx) {
    return "*"; // 允许来自所有域名请求
  },
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 5,
  credentials: true,
  allowMethods: ['GET', 'POST', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

let accountInfo = {};
let startGetTickHistoryOptions = {};
//初始化函数
initExchange();

async function initExchange() {
  //账户基本信息，交易结果
  accountInfo = await account.getAccount();
  //开始交易的参数
  startGetTickHistoryOptions = {
    //交易账户
    accountInfo,
    //交易币对
    ins_id: "EOS-USD-SWAP",
    //交易开始时间
    startTime: new Date(),
    // endTime: new Date(new Date().getTime() + (1000 * 20)),
    //交易结束时间，本系统暂设定 持续交易不能超过24小时，需要重新启动
    endTime: new Date(new Date().getTime() + (1000 * 60) * 60 * 6),
    //刷新行情的频率（秒）
    gapTime: 1,
    //交易策略
    strategy: strategy.strategy,
    //交易账户初始化
    initAccount: account.initAccount,
    //这些参数是要可以被修改优化的
    strategyOptions: {
      //基准价，策略会认为基于这个价上下波动
      basicPrice: 4.768,
      /*
      * 入场交易量
      * 第一手交易数量,建议设置小一点，行情从开始连续跳水，则只套牢这一手
      * 因为第一手没有卖出是不会交易的
      * */
      fHand: 100,
      //入场波动率，第一手交易的价格低于基准价的百分数，如果为负数就会高于基准价买入,默认 0.01
      fHandRate: 0.00004,
      //交易手续费 默认 0.1%，策略用来计算收益
      feeRate: 0.001,
      //最小交易量，小于这个数，不交易
      minExchange: 10,
      //（基于基准价）最小波动级别，需要波动 gardRate 才能交易一次
      // 默认： >0.4%=1  >0.8%=2  >1.2%=3  >1.6%=4 >2%=5  >2.4%=n
      gardRate: 0.001,
      //交易的梯度，每波动添加一级交易数量就添加这个数
      exchangeGrad: 100,
      //最大年化收益率百分比，达到了就停止交易，默认 100 %
      maxYearRate: 300,
      //最大仓位，默认 50%，大于这个仓位就不交易
      maxExchangeRate: 0.5,
      //（基于基准价）拒绝交易买入波动，行情可能跳水，不要买入
      rejectGardRateIn: 0.04,
      //（基于基准价）拒绝交易卖出波动，行情上涨厉害，不卖出
      rejectGardRateOut: 0.06,
      //是否启用做空，默认只做多。设置为 true 做空就会在行情还是进行卖出。
      isShort: false,
      /*
      * 拒绝交易爆仓价率
      * 爆仓价率，如果 爆仓价/当前价 >= burstRate 就不下单
      * 做合约需要填入这个参数，默认 0.5
      * 比如当前价 5，手上的单子爆仓价为 >=2.5 则不能继续买入
      * */
      burstRate: 0.5,
    },
    //交易信息记录
    noteExchange: dataNoter.noteExchange,
  };
  //开始交易
  ticker.startGetTickHistory(startGetTickHistoryOptions);
}


//交易历史
router.get('/exchange-history', async (ctx, next) => {
  accountInfo.basicPrice = startGetTickHistoryOptions.strategyOptions.basicPrice;
  ctx.response.body = {
    accountInfo,
    startGetTickHistoryOptions
  };
});
/*
* 停止
* */
router.get('/stop', async (ctx, next) => {
  accountInfo.status = 0;
  accountInfo.resason = "人工手动操作";
  ctx.response.body = {
    res: "停止完成"
  };
});
/*
* 重启
* */
router.get('/start', async (ctx, next) => {
  //先要平仓
  let query = ctx.query;
  let sOptions = ticker.getTickerParamByReq(query, startGetTickHistoryOptions);
  console.log("开始检查策略配置");
  if (!sOptions.strategyOptions.basicPrice) {
    console.log("没有设置基准价，不交易");
    ctx.response.body = {
      res: "启动失败，没有设置基准价",
      query: sOptions,
    };
    return
  }
  if (!sOptions.strategyOptions.fHand) {
    console.log("没有设置第一手交易量，不交易");
    ctx.response.body = {
      res: "启动失败，没有设置第一手交易量",
      query: sOptions,
    };
    return
  }
  if (!sOptions.strategyOptions.minExchange) {
    console.log("没有设置基最小交易量，不交易");
    ctx.response.body = {
      res: "启动失败，没有设置基最小交易量",
      query: sOptions,
    };
    return
  }
  if (!sOptions.strategyOptions.exchangeGrad) {
    console.log("没有设置交易梯度，不交易");
    ctx.response.body = {
      res: "启动失败，没有设置交易梯度",
      query: sOptions,
    };
    return
  }
  console.log("开始启动");
  ticker.startGetTickHistory(sOptions);
  ctx.response.body = {
    res: "重新开始成功",
    query: sOptions,
  };
});

//实时或者最新价格
router.get('/btc-intime', async (ctx, next) => {
  let ins_id = "BTC-USD-SWAP";
  let res = await pClient.swap().getTicker(ins_id);
  //仓位信息
  let resA = await aClient.swap().getPosition(ins_id);
  let holding = resA.holding;
  let priceInfo = {
    time: res.timestamp,
    price: res.last
  };
  if(holding && holding.length === 2){
    priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0
    priceInfo.shortPrice = holding && holding[1] && holding[1].avg_cost || 0
  }else if(holding && holding.length === 1){
    if(holding[0].side==="long"){
      priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0;
      priceInfo.shortPrice = 0
    }else {
      priceInfo.longPrice = 0;
      priceInfo.shortPrice = holding && holding[0] && holding[0].avg_cost || 0
    }
  }else {
    priceInfo.longPrice = 0
    priceInfo.shortPrice = 0
  }
  
  ctx.response.body = priceInfo;
});
router.get('/eos-intime', async (ctx, next) => {
  let ins_id = "EOS-USD-SWAP";
  let res = await pClient.swap().getTicker(ins_id);
  //仓位信息
  let resA = await aClient.swap().getPosition(ins_id);
  let holding = resA.holding;
  let priceInfo = {
    time: res.timestamp,
    price: res.last
  };
  if(holding && holding.length === 2){
    priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0
    priceInfo.shortPrice = holding && holding[1] && holding[1].avg_cost || 0
  }else if(holding && holding.length === 1){
    if(holding[0].side==="long"){
      priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0;
      priceInfo.shortPrice = 0
    }else {
      priceInfo.longPrice = 0;
      priceInfo.shortPrice = holding && holding[0] && holding[0].avg_cost || 0
    }
  }else {
    priceInfo.longPrice = 0
    priceInfo.shortPrice = 0
  }
  ctx.response.body = priceInfo;
});

/*
* 测试已有数据优化策略
* todo
* */
router.get('/test-exchange-history', async (ctx, next) => {
});

app.use(router.routes());
// 监听端口≈
app.listen(port, function () {
  console.log("查看行情历史与资金历史:");
  console.log('http://localhost:' + port + "/eos");
});
