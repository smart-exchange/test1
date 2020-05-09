/*
* 获取 okex 永续合约行情信息
* 测试公共信息，不需要登录认证
* */
const { PublicClient } = require('@okfe/okex-node');
var config  = require('./config');
const pClient = new PublicClient(config.urlHost, 30000);

//永续合约

//法币汇率
// pClient.swap().getRate().then(res => console.log(JSON.stringify(res)));
//合约信息
// pClient.swap().getInstruments().then(res => console.log(JSON.stringify(res)));


//Tiker信息
// pClient.swap().getTicker("BTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// 获取成交数据
// pClient.swap().getTrades("BTC-USD-SWAP").then(res => {
//   console.log(JSON.stringify(res))
//   res.map(item=>{
//     console.log(item.price)
//   })
// });

// 获取k线数据
pClient.swap().getCandles("BTC-USD-SWAP",{
  start:"2019-12-05T16:00:00.000Z",
  end:"2020-02-08T16:00:00.000Z",
  granularity:"21600"
}).then(res => {
  console.log(JSON.stringify(res))
  // time	String	开始时间
  // open	String	开盘价格
  // high	String	最高价格
  // low	String	最低价格
  // close	String	收盘价格
  // volume	String	交易量
  res.map(item=>{
    console.log(item[1])
  })
  console.log(res.length)
});
// 获取指数信息
// pClient.swap().getIndex("BTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// 获取平台总持仓量
// pClient.swap().getOpenInterest("BTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// 获取k线数据 当前时刻
// pClient.swap().getMarkPrice("BTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// 获取合约历史资金费率
// pClient.swap().getHistoricalFudingRate("BTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
