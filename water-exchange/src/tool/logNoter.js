/*
* 记录日志，每分钟都要预测一下，把预测结果的原因记录下来
* */
const fs = require("fs");
function noteExchange(options) {
  let fileName = options.fileName;
  let data = options.data;
  fs.writeFile("logs/"+fileName, data, function (err) {
    if (err) {
      console.log("文件内容");
      console.log(data);
    } else {
      console.log(fileName);
    }
  });
}
module.exports.noteExchange = noteExchange;
