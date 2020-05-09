/*
* 数据处理
* */
const originData = require('./originData');
let data = originData.getData();
/*
* 导出此模块
* */
module.exports.data = data;
module.exports.getData = originData.getData;




