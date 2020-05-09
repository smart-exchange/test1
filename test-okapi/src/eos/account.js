/*
* 实时获取账户信息
* */
const {AuthenticatedClient, PublicClient} = require('@okfe/okex-node');
const config = require('../config/config-jiaoyi');
const authClient = new AuthenticatedClient(config.httpkey, config.httpsecret, config.passphrase, config.urlHost);
const pClient = new PublicClient(config.urlHost, 30000);
const accountInfo = {
  name: "EOS-1",//账户名字
  getMoney: 0,//总获利
  getYearRate: 0,//年化收益率,
  
  _isFirst: true,//第一次计算资金，初始资金只计算一次
  /*
  * todo,通过账单流水查询收益
  * 初始资金，开始等于全部资金，交易中会大于 实时资金，因为包含资金费用还有未结算的资金等
  * */
  initFound: 5000,
  //全部资金,实时可用资金
  found: 5000,
  
  price: 10,//当前数字货币价格，随便假设一个数，在交易过程中会实时变化
  fee: 0,//手续费，开始没有交易为 0
  times: 0,//交易次数，没有没有交易为 0
  cCount: 0,//当前持仓（数字货币个数），开始没有交易
  exchangeHistory: [],//交易历史信息，开始无
  foundHistory: [],//资金历史信息，开始无
  tickerHistory: [],//交易行情历史，开始无,
  status: 0,//交易状态，0：停止，1 为正在交易，
};
const ins_id = "EOS-USD-SWAP";

/*
* todo 账户信息要实时获取线上
* 可能修改
* 交易之前初始化账户，从线上获取账户进行数据覆盖
* */
//账户基本信息，交易结果 async
async function getAccount() {
  console.log(accountInfo);
  return accountInfo;
  // let res = await getAccountPromise(ins_id);
  // if(res){
  //   if (accountInfo._isFirst) {
  //     //初始资金只需要第一次计算
  //     accountInfo.initFound = res.price * res.av_cCount;
  //     accountInfo._isFirst = false;
  //   };
  //   accountInfo.found = res.price * res.cCount;
  //   accountInfo.price = res.price;
  //   console.log(JSON.stringify(res));
  //   console.log(JSON.stringify(accountInfo));
  // }else {
  //   //发生错误了不能交易
  // }
}

/*
* 初始化账户信息，
* todo
* 从线上获取真实账户
* 可能需要平仓
* */
function initAccount(accountInfo) {
  accountInfo.tickerHistory = [];
  accountInfo.exchangeHistory = [];//交易历史信息，开始无
  accountInfo.foundHistory = [];//资金历史信息，开始无
  accountInfo.times = 0;//交易次数
  accountInfo.fee = 0;//手续费
  accountInfo.cCount = 0;//当前持仓
  accountInfo.getYearRate = 0;//收益率，
  accountInfo.getMoney = 0;//收入
  accountInfo.status = 1;//交易状态
  // todo
  // 要实时获取
  accountInfo.found = 5000;//
}


function getAccountPromise(ins_id) {
  //账户信息
  let _accountInfo = authClient.swap().getAccount(ins_id);
  //最新价格
  let _tickerInfo = pClient.swap().getTicker(ins_id);
  //杠杆设置
  let _settings = authClient.swap().getSettings(ins_id);

  let _position = authClient.swap().getPosition(ins_id);

  
  /*
  * 三个接口返回的参数意义，可以参考
  * https://www.okex.me/docs/zh/#swap-swap---singleness-single
  * */
  let pArr = [_accountInfo, _tickerInfo, _settings,_position];
  return new Promise((resolve) => {
    let accountComposite = null;
    Promise.all(pArr).then((result) => {
      let [info, t, s, p] = result;
      let a = info.info;
      let first = p.holding[0];
      accountComposite = {
        hasCCount: first.position,//持仓数量
        price: t.last,//价格
        cCount: a.max_withdraw,//数量
        av_cCount: a.total_avail_balance,//可用数量
        times: s.long_leverage,//倍数
        canOpenAll: a.max_withdraw * s.long_leverage,//可开总数
      };
      resolve(accountComposite);
    }).catch((error) => {
      resolve(accountComposite);
      console.log("请求账户发生错误");
      console.log(error)
    })
  });
};

//
// // 单个币账户信息
// authClient.swap().getAccount(ins_id).then(res => {
//   // max_withdraw 可以划转的数量
//   // maint_margin_ratio 维持保证金率
//   // 杠杆倍数 50
//   let times = 50;
//   let info  = res.info;
//   let {max_withdraw,maint_margin_ratio} = info;
//   console.log(JSON.stringify(res))
//   console.log("可用标的："+max_withdraw);
//   console.log("保证金率："+maint_margin_ratio);
//   console.log(max_withdraw*50);
// });
//
// //行情信息
// pClient.swap().getTicker(ins_id).then(res => {
//   console.log(JSON.stringify(res));
//   console.log("当前价格"+res.last)
// });
//
// //获取某个合约的用户配置
// authClient.swap().getSettings("EOS-USD-SWAP").then(res => {
//   console.log(JSON.stringify(res))
//   console.log("杠杆倍数"+res.long_leverage);
// });

//所有合约/单个合约持仓信息
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


// 设定某个合约的杠杆倍数
// 这个接口权限需要可写
// let param1 = {"leverage": "11","side": "3"};
// authClient.swap().postLeverage("LTC-USD-SWAP", param1).then(res => console.log(JSON.stringify(res)));


module.exports.getAccount = getAccount;
module.exports.initAccount = initAccount;
