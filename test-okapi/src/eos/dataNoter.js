/*
* 数据记录
* */
const fs = require("fs");

/*
* 把跑的数据保存起来
* fileName 文件名称
* data 要保存的数据
* */
function noteExchange(options) {
  let fileName = options.fileName;
  let data = options.data;
  console.log("---------");
  console.log("交易结束");
  console.log("本次获利："+ data.getMoney);
  console.log("年化收益率："+ data.getYearRate);
  console.log("---------");
  fs.writeFile( fileName,JSON.stringify(options.data),function(err){
    if(err){
      console.log("交易历史文件写入失败");
      console.log("文件内容");
      console.log(data);
    }else{
      console.log("交易历史文件写入成功");
      console.log(fileName);
    }
  });
}
module.exports.noteExchange = noteExchange;
