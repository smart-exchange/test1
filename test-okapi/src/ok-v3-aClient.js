/*
* 测试个人信息，需要登录认证
* 申请 api 的权限的时候，有只读 与 可写，有些接口需要可写才行
* */
const {AuthenticatedClient} = require('@okfe/okex-node');
// var config = require('./config');
var config = require('./src/config/config-jiaoyi');
const authClient = new AuthenticatedClient(config.httpkey, config.httpsecret, config.passphrase, config.urlHost);
// 账单流水查询
// authClient.swap().getLedger("EOS-USD-SWAP").then(res => console.log(JSON.stringify(res)));


//永续合约
// 获取合约挂单冻结数量
// authClient.swap().getHolds("EOS-USD-SWAP").then(res => console.log(JSON.stringify(res)));
//获取某个合约的用户配置
// authClient.swap().getSettings("EOS-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// 可以手动修改 app 查看效果
// authClient.swap().getSettings("BTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// authClient.swap().getSettings("LTC-USD-SWAP").then(res => console.log(JSON.stringify(res)));

// 设定某个合约的杠杆倍数
// 这个接口权限需要可写
// let param1 = {"leverage": "11","side": "3"};
// authClient.swap().postLeverage("LTC-USD-SWAP", param1).then(res => console.log(JSON.stringify(res)));

//所有合约/单个合约持仓信息
authClient.swap().getPosition("ETC-USD-SWAP").then(res => console.log(JSON.stringify(res)));
// let a = {
//   "margin_mode": "crossed",
//   "timestamp": "2020-02-19T09:00:01.655Z",
//   "holding": [{
//     "avail_position": "0",
//     "avg_cost": "4.571",
//     "instrument_id": "EOS-USD-SWAP",
//     "last": "4.561",
//     "leverage": "50.00",
//     "liquidation_price": "4.668",
//     "maint_margin_ratio": "0.0100",
//     "margin": "24.6569",
//     "position": "562",
//     "realized_pnl": "2.6696",
//     "settled_pnl": "0.0000",
//     "settlement_price": "4.571",
//     "side": "long",
//     "timestamp": "2020-02-19T09:00:01.655Z",
//     "unrealized_pnl": "-3.3552"
//   }, {
//     "avail_position": "1758",
//     "avg_cost": "4.395",
//     "instrument_id": "EOS-USD-SWAP",
//     "last": "4.561",
//     "leverage": "50.00",
//     "liquidation_price": "4.668",
//     "maint_margin_ratio": "0.0100",
//     "margin": "77.1296",
//     "position": "1758",
//     "realized_pnl": "2.6696",
//     "settled_pnl": "-107.1472",
//     "settlement_price": "4.516",
//     "side": "short",
//     "timestamp": "2020-02-19T09:00:01.655Z",
//     "unrealized_pnl": "-35.9282"
//   }]
// }


let b = {
  "margin_mode": "crossed",
  "timestamp": "2020-02-19T08:46:33.675Z",
  "holding": [{
    "avail_position": "506",
    "avg_cost": "10155.2",
    "instrument_id": "BTC-USD-SWAP",
    "last": "10165.2",
    "leverage": "100.00",
    "liquidation_price": "10030.8",
    "maint_margin_ratio": "0.0050",
    "margin": "0.0497",
    "position": "506",
    "realized_pnl": "-0.0295",
    "settled_pnl": "0.0000",
    "settlement_price": "10155.2",
    "side": "long",
    "timestamp": "2020-02-19T08:46:33.675Z",
    "unrealized_pnl": "0.0052"
  }]
}


// 获取所有订单列表
// authClient.swap().getOrders("EOS-USD-SWAP",{
//   state:0,
//   limit:1
// }).then(res => console.log(JSON.stringify(res)));
//获取订单信息
// authClient.swap().getOrder("EOS-USD-SWAP", '429571669055197184').then(res => console.log(JSON.stringify(res)));

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

// 撤销订单
// authClient.swap().postCancelOrder("EOS-USD-SWAP", "test1").then(res => console.log(JSON.stringify(res)));


// 所有币种/单个币账户信息
// authClient.swap().getAccount().then(res => console.log(JSON.stringify(res)));
// authClient.swap().getAccount("EOS-USD-SWAP").then(res => console.log(JSON.stringify(res)));
let s = {
  "margin_mode": "crossed",
  "timestamp": "2019-06-13T01:18:11.341Z",
  "holding": [{
    "avail_position": "0",
    "avg_cost": "0",
    "instrument_id": "LTC-USD-SWAP",
    "last": "77.69",
    "leverage": "0",
    "liquidation_price": "0",
    "maint_margin_ratio": "0",
    "margin": "0",
    "position": "0",
    "realized_pnl": "0",
    "settled_pnl": "0",
    "settlement_price": "0",
    "side": "long",
    "timestamp": "2019-06-13T01:18:11.341Z",
    "unrealized_pnl": "0"
  }, {
    "avail_position": "0",
    "avg_cost": "0",
    "instrument_id": "LTC-USD-SWAP",
    "last": "77.69",
    "leverage": "0",
    "liquidation_price": "0",
    "maint_margin_ratio": "0",
    "margin": "0",
    "position": "0",
    "realized_pnl": "0",
    "settled_pnl": "0",
    "settlement_price": "0",
    "side": "short",
    "timestamp": "2019-06-13T01:18:11.341Z",
    "unrealized_pnl": "0"
  }]
}

