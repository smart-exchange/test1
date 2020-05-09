/*
* 分钟级别行情数据记录
* okex的api目前只提供获取最近 1440 条分钟级别的数据，最近一天
* 我想获取更多分钟级别的数据，这边用一个脚本，定时拉取数据
* 这里报错BTC,EOS的数据
* */
const fs = require("fs");
const {PublicClient} = require('@okfe/okex-node');
const pClient = new PublicClient("https://www.okex.me", 30000);
/*
* new Date().toISOString() + 8
* 就可以得到当前的时间
* 比如 "2020-02-20T09:04:05.131Z"
*  代表中国时间 2020-02-20 17:04:05.131
* */
saveTicker({
  ins_id: "BTC-USD-SWAP",
  timeGap:60*60* 3,//秒数
});

function saveTicker(options) {
  let ins_id = options.ins_id;
  let timeGap = options.timeGap;
  requestTicker(ins_id, timeGap);
  setInterval(() => {
    requestTicker(ins_id, timeGap);
  }, timeGap * 1000)
};

//请求数据
function requestTicker(ins_id, timeGap) {
  console.log("获取前三小时的数据：");
  //三小时之前  ---  当前
  let start = new Date(new Date().getTime() - 1000 * timeGap).toISOString();
  let end = new Date().toISOString();
  // 获取k线数据，默认最近 200 条
  pClient.swap().getCandles(ins_id, {
    start,
    end,
    granularity: "60",// 60 代表分钟级别
  }).then(res => {
    // console.log(JSON.stringify(res))
    // time	String	开始时间
    // open	String	开盘价格
    // high	String	最高价格
    // low	String	最低价格
    // close	String	收盘价格
    // volume	String	交易量
    // res.map(item=>{
    //   console.log(item[1])
    // })
    // console.log(res[res.length-1][1]);
    // console.log(res.length)
    // console.log(new Date().toISOString());
    let fileName = "" + start +"--"+ end + ".json";
    noteExchange({fileName, data: JSON.stringify(res)})
  });
};

function noteExchange(options) {
  let fileName = options.fileName;
  let data = options.data;
  fs.writeFile(fileName, data, function (err) {
    if (err) {
      console.log("交易历史文件写入失败");
      console.log("文件内容");
      console.log(data);
    } else {
      console.log("交易历史文件写入成功");
      console.log(fileName);
    }
  });
}

module.exports.noteExchange = noteExchange;
