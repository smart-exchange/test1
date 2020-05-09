/*
* 只提供交易所的数据，与策略逻辑本身无关
* 生产环境数据需要通过 API 实时获取
* 获取的数据是数组，数组每个元素就代表一个一分钟级别的数据其中包裹
* [时间，开盘，最高，最低，收盘，交易量(按照合约数量), 交易量(按照币个数)]
* */

const fs = require("fs");
// 同步读取
let data = fs.readFileSync('src/2020-2-19-20:10to2020-2-29-10:15.arr.json');
let localData = data.toString();
/*
* dataRequest 如果有传入实时数据，则不用本地的历史数据，返回实时数据
* orderOk 数据是否是排序好了的
* */
function getData(dataRequest, orderOk){
  let originData = JSON.parse(localData);
  if(dataRequest){
    originData = JSON.parse(dataRequest);
  }
  /*
  * 数据排序
  * 获取的数据是一个数组，并且最近的数据在数组前面，把数据翻转一下
  * 最近一天的数据，由远到近
  * */
  if(!orderOk){
    originData = originData.reverse();
  }
  
  /*
  * 转数字
  * 获取到的数据，数字是字符串，不方便计算，这里把字符串转为浮点数
  * */
  originData = originData.map(item => {
    return [
      item[0],
      parseFloat(item[1]),
      parseFloat(item[2]),
      parseFloat(item[3]),
      parseFloat(item[4]),
      parseFloat(item[5]),
      parseFloat(item[6]),
    ]
  });
  
  /*
  * 计算指数
  * */
  let MA5 = calculateMA(5, originData);
  let MA10 = calculateMA(10, originData);
  let MA20 = calculateMA(20, originData);
  let MA30 = calculateMA(30, originData);
  
  /*
  * 插入指数到原始数据
  * 原始数据没有指数数据
  * */
  originData.map((item, index) => {
    item[7] = MA5[index];
    item[8] = MA10[index];
    item[9] = MA20[index];
    item[10] = MA30[index];
  });
  
  return originData;
}



/*
  * 计算均线值
  * @params dayCount 前几天
  * @data 行情数据
  * @return 返回均线历史数据
  * */
function calculateMA(dayCount, data) {
  let result = [];
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      sum += data[i - j][1];
    }
    result.push(+(sum / dayCount).toFixed(3));
  }
  return result;
}

// 导出模块
module.exports.getData = getData;

