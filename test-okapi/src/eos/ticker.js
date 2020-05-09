// okex nodeSdk
const {PublicClient} = require('@okfe/okex-node');
const config = require('../config/config-jiaoyi');
const pClient = new PublicClient(config.urlHost, 30000);
//开始交易轮询行情
let timer = null;
//不断检查是否可以开始
let timerStart = null;
//行情数据，实时变化
let tickerHistory = [];

/*
* 获取真实行情并且交易
* strategy 交易策略
* strategyOption 交易策略参数
* */
function setTickHistory(options) {
    pClient.swap().getTicker(options.ins_id).then(res => {
      tickerHistory.push(res);
      let priceInfo = {
        time: res.timestamp,
        price: res.last
      };
      console.log("最新----" + res.last);
      options.accountInfo.tickerHistory = tickerHistory.map(item => {
        return {
          time: item.timestamp,
          price: item.last//最新成交价
        }
      });
      options.strategyOptions.priceInfo = priceInfo;
      options.strategyOptions.accountInfo = options.accountInfo;
      //每次获取就进行交易
      options.strategy(options.strategyOptions);
    });
}

/*
* 交易配置入口
* startTime 开始时间
* endTime 结束时间
* gapTime 间隔多少时间获取（秒）
* strategy 交易策略
* strategyOption 交易策略参数
* */
function startGetTickHistory(options) {
  tickerHistory = [];
  let startTime = options.startTime || new Date();
  let endTime = options.endTime || new Date();
  //时间不能大于24小时
  if ((new Date(endTime).getTime() - new Date(startTime).getTime()) > 1000 * 60 * 60 * 24) {
    console.log("持续交易时间大于24小时，不能交易");
    return;
  }
  
  let gapTime = options.gapTime || 3;
 
  clearInterval(timer);
  clearInterval(timerStart);
  console.log("启动时间没到");
  if (new Date() >= startTime) {
    console.log("--------------");
    console.log("开始交易时间：" + startTime);
    console.log("结束交易时间：" + endTime);
    console.log("基准价：" + options.strategyOptions.basicPrice);
    console.log("波动级别：" + options.strategyOptions.gardRate);
    console.log("刷新行情间隔（秒）：" + options.gapTime);
    console.log("--------------");
    console.log("低于基准价：买入，高于则卖出");
    console.log("--------------");
    options.initAccount(options.accountInfo);
    //时间合适就开始
    setTickHistory(options);
    timer = setInterval(() => {
      setTickHistory(options);
      if (new Date() >= endTime) {
        //结束交易
        clearInterval(timer);
        options.noteExchange({
          fileName: new Date() + options.accountInfo.name,
          data: options.accountInfo
        })
      }
    }, gapTime * 1000);
  } else {
    console.log("因重新启动,时间未到交易时间，关闭上一次交易");
    options.accountInfo.status = 0;
    options.accountInfo.resason = "因重新启动,时间未到交易时间，关闭上一次交易";
    options.noteExchange({
      fileName: new Date() + options.accountInfo.name,
      data: options.accountInfo
    });
    
    //没有到交易时间则不断轮询，判断是否到时间了
    timerStart = setInterval(() => {
      if (new Date() >= startTime) {
        clearInterval(timerStart);
        console.log("--------------");
        console.log("开始交易时间：" + startTime);
        console.log("结束交易时间：" + endTime);
        console.log("基准价：" + options.strategyOptions.basicPrice);
        console.log("波动级别：" + options.strategyOptions.gardRate);
        console.log("刷新行情间隔（秒）：" + options.gapTime);
        console.log("--------------");
        console.log("低于基准价：买入，高于则卖出");
        console.log("--------------");
        options.initAccount(options.accountInfo);
        //时间合适就开始
        setTickHistory(options);
        timer = setInterval(() => {
          setTickHistory(options);
          if (new Date() >= endTime) {
            //结束交易
            clearInterval(timer);
            options.noteExchange({
              fileName: new Date() + options.accountInfo.name,
              data: options.accountInfo
            })
          }
        }, gapTime * 1000);
        
      }
      
    }, 1000);
    
    
  }
};

/*
* 根据请求设置测试参数
* */
function getTickerParamByReq(req, originOptions) {
  
  // new Date(年,（月-1）,日, 时,分,秒);
  // 用户填入 time = [2020,2,2,13,12,12] new Date(...a);
  //交易开始时间
  originOptions.startTime = req.startTime ? new Date(req.startTime) : new Date();
  //交易结束时间
  originOptions.endTime = req.endTime ? new Date(req.endTime) : new Date(new Date().getTime() + (1000 * 60) * 60);
  //刷新行情的频率（秒）
  originOptions.gapTime = parseFloat(req.gapTime) || 1;
  
  //策略参数
  // 基准价
  originOptions.strategyOptions.basicPrice = parseFloat(req.basicPrice);
  //入场交易量
  originOptions.strategyOptions.fHand = parseFloat(req.fHand);
  //入场波动率
  originOptions.strategyOptions.fHandRate = parseFloat(req.fHandRate) || 0.0001;
  //费率
  originOptions.strategyOptions.feeRate = parseFloat(req.feeRate) || 0.001;
  
  
  //最小交易量
  originOptions.strategyOptions.minExchange = parseFloat(req.minExchange);
  //最小波动级别
  originOptions.strategyOptions.gardRate = parseFloat(req.gardRate) || 0.001;
  //交易的梯度
  originOptions.strategyOptions.exchangeGrad = parseFloat(req.exchangeGrad);
  // 最大年化收益率百分比
  originOptions.strategyOptions.maxYearRate = parseFloat(req.maxYearRate) || 300;
  
  
  //最大仓位
  originOptions.strategyOptions.maxExchangeRate = parseFloat(req.maxExchangeRate) || 0.5;
  //拒绝卖入波动
  originOptions.strategyOptions.rejectGardRateIn = parseFloat(req.rejectGardRateIn) || 0.04;
  //拒绝卖出波动
  originOptions.strategyOptions.rejectGardRateOut = parseFloat(req.rejectGardRateOut) || 0.06;
  //是否做空
  originOptions.strategyOptions.isShort = !!req.isShort || false;
  
  //爆仓价率
  originOptions.strategyOptions.burstRate = parseFloat(req.burstRate) || 0.5;
  
  return originOptions;
}

module.exports.getTickerParamByReq = getTickerParamByReq;
module.exports.startGetTickHistory = startGetTickHistory;
