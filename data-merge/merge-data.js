/*
* 处理行情数据
* 合并
* */

const fs = require('fs');
const path = require('path');
const toExcel = require('./src/toExcel');
const {toCSV} = require('./src/toCSV');

/*
* 获取目录下的文件
* */
function readFileList(dir, filesList = []) {
  console.log("获取目录下的文件：" + dir);
  const files = fs.readdirSync(dir);
  files.forEach((item) => {
    let fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      //递归读取文件
      readFileList(path.join(dir, item), filesList);
    } else {
      filesList.push(fullPath);
    }
  });
  return filesList;
}

/*
*
* 获取文件内容
* */
function getFileListContent(filesList) {
  console.log("依次获取文件内容：");
  let content = {}, len = filesList.length;
  for (let i = 0; i < len; i++) {
    content[filesList[i]] = fs.readFileSync(filesList[i], 'utf-8');
  }
  return content;
}

/*
* 合并文件
* */

function compositeContent(filesContent) {
  console.log("合并文件内容：");
  let allContent = [];
  Object.keys(filesContent).map(key => {
    allContent = allContent.concat(JSON.parse(filesContent[key]))
  });
  return allContent;
}

/*
* 去重
* */
function unique(allContent) {
  console.log("合并之后行情数据去重：");
  let obj = {}, newArr = [], len = allContent.length;
  for (let i = 0; i < len; i++) {
    let item = allContent[i];
    if (!obj[item[0]]) {
      newArr.push(item);
      obj[item[0]] = 1;
    }
  }
  return newArr;
}

/*
* 排序
* */
function sortByTime(arr) {
  console.log("行情数据时间排序：");
  let mapArr = arr.map(item => {
    return {
      key: new Date(item[0]).getTime(),
      item,
    }
  });
  mapArr.sort(compare("key"));
  arr = mapArr.map(item => item.item);
  return arr;
  
  function compare(property) {
    return function (a, b) {
      return a[property] - b[property];
    }
  }
}


/*
* 计算均线值
* 最近几天的价格平均值
* (p1+p2+p3+p4+p5)/5
* @params dayCount 前几天
* @data 行情数据
* @return 返回均线历史数据
* */
function calculateMA(dayCount, data) {
  console.log("计算: MA" + dayCount);
  let result = [];
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount - 1) {
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

/*
* 计算指数均线值
* 最近几天的价格加权平均值，最近的价格权重越大
* weightAll = 1+2+3+4+5
* (p1*(1/weightAll) + p2*(2/weightAll) + p3*(3/weightAll) + p4*(4/weightAll) + p5*(5/weightAll))/5
* @params dayCount 前几天
* @data 行情数据
* @return 返回均线历史数据
* */
function calculateEMA(dayCount, data) {
  console.log("计算: EMA" + dayCount);
  let result = [];
  let weightAll = 0;
  for (let n = 0; n <= dayCount; n++) {
    weightAll += n;
  }
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount - 1) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      let lData = data[(i - (dayCount - j) + 1)][1];
      let weight = (j + 1);
      // console.log("权重:" + weight);
      // console.log("最近数据:" + lData);
      sum += lData * weight;
    }
    result.push(+(sum / weightAll).toFixed(3));
  }
  return result;
}

/*
* 把数据转为数字
* */
function setFloat(sorted) {
  console.log("转数字：");
  return sorted.map(item => {
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
}

/*
* 批量计算EMA
* */
function batchCalculateEMA(sortedMath) {
  console.log("批量计算EMA：");
  /*
   * 计算指数
   * */
  let EMA5 = calculateEMA(5, sortedMath);
  let EMA10 = calculateEMA(10, sortedMath);
  let EMA20 = calculateEMA(20, sortedMath);
  let EMA30 = calculateEMA(30, sortedMath);
  /*
  * 插入指数到原始数据
  * 原始数据没有指数数据
  * */
  sortedMath = sortedMath.map((item, index) => {
    item[7] = EMA5[index];
    item[8] = EMA10[index];
    item[9] = EMA20[index];
    item[10] = EMA30[index];
    return item;
  });
  return sortedMath;
}

/*
* 批量计算MA
* */
function batchCalculateMA(sortedMath) {
  console.log("批量计算MA：");
  /*
   * 计算指数
   * */
  let MA5 = calculateMA(5, sortedMath);
  let MA10 = calculateMA(10, sortedMath);
  let MA20 = calculateMA(20, sortedMath);
  let MA30 = calculateMA(30, sortedMath);
  /*
  * 插入指数到原始数据
  * 原始数据没有指数数据
  * */
  sortedMath = sortedMath.map((item, index) => {
    item[11] = MA5[index];
    item[12] = MA10[index];
    item[13] = MA20[index];
    item[14] = MA30[index];
    return item;
  });
  return sortedMath;
}


/*
* 计算 涨幅 与 振幅
* 涨幅 =  (close-open)*2 / (close+open)
* 振幅 = (highest-lowest)*2 / (highest+lowest)
* */
function batchCalculateWave(sortedMath) {
  console.log("计算 涨幅 与 振幅：");
  sortedMath = sortedMath.map((item, index) => {
    item[15] = ((item[4] - item[1]) * 2 / (item[4] + item[1])).toFixed(4);
    item[16] = ((item[2] - item[3]) * 2 / (item[2] + item[3])).toFixed(4);
    return item;
  });
  return sortedMath;
}


/*
* 数据转 map 方便辨认字段意义
* */
function arrSwMap(sortedMath) {
  console.log("数据转 map 结构")
  return sortedMath.map(item => {
    return {
      time: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      
      close: item[4],
      volumeByPaper: item[5],
      volume: item[6],
      
      ema5: item[7],
      ema10: item[8],
      ema20: item[9],
      ema30: item[10],
      
      ma5: item[11],
      ma10: item[12],
      ma20: item[13],
      ma30: item[14],
      gain: item[15],
      amplitude: item[16],
    };
  })
}


/*
* 检查是否有遗漏的行情数据
* 处理好的行情数据，前后间隔不是一分钟的数据，就是异常数据
* */
function checkData(sorted) {
  console.log("检测行情数据异常：");
  let errData = [];
  sorted.map((item, index) => {
    if (index > 0) {
      let fData = sorted[index - 1][0] || sorted[index - 1].time;
      let nData = sorted[index][0] || sorted[index].time;
      let f = new Date(fData).getTime();
      let c = new Date(nData).getTime();
      if ((c - f) > 60000 || (c - f) < 60000) {
        errData.push(index);
      }
    }
  });
  return errData;
}

/*
* 记录数据
* */
function note(options) {
  let fileName = options.fileName;
  let data = options.data;
  let res = fs.writeFileSync(fileName, data);
  if (res) {
    console.log("文件保存发生错误");
    console.log(data)
  } else {
    console.log("成功写入数据到本地：" + fileName);
  }
  return res;
}

/*
* 格式化数据
* */
function formatTime(time) {
  let d = new Date(time);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "-" + d.getHours() + ":" + d.getMinutes();
}

/*
* 报错行情数据，可以保存行情数据：数组结构 或者 map 结构
* 可以在文件前后添加内容
* 文件命名
* */
function saveData(options) {
  let {sorted, uniName = "", suffix = ".json", prifixContent = "", suffixContent = ""} = options;
  let errData = checkData(sorted);
  console.log("异常行情数量:" + errData.length);
  console.log("异常行情序号:" + errData);
  console.log("总行情数量:" + sorted.length);
  let fData = sorted[0][0] || sorted[0].time;
  let nData = sorted[sorted.length - 1][0] || sorted[sorted.length - 1].time;
  let fileName = formatTime(fData) + "to" + formatTime(nData) + uniName + suffix;
  return note({
    fileName,
    data: prifixContent + JSON.stringify(sorted) + suffixContent
  });
}

/*
* 必须传入对应的 map 格式
* */
function saveExcel(options) {
  let {sorted, uniName = "", suffix = ".json", columns} = options;
  let fData = sorted[0].time;
  let nData = sorted[sorted.length - 1].time;
  let fileName = formatTime(fData) + "to" + formatTime(nData) + uniName + suffix;
  
  /*
  * 保存表格，方便数据研究人员使用
  * */
  toExcel.toSwichExcel({
    data: sorted,
    fileName: fileName + '.xlsx',
    columns,
  });
}

/*
* 必须传入对应的 map 格式
* */
function saveCSV(options) {
  let {sorted, uniName = "", suffix = ".json", fields} = options;
  let fData = sorted[0].time;
  let nData = sorted[sorted.length - 1].time;
  let fileName = formatTime(fData) + "to" + formatTime(nData) + uniName + suffix;
  toCSV({
    fileName: fileName + '.csv',
    fields,
    data: sorted
  })
}

let filesList = readFileList(__dirname + "/history");
let filesContent = getFileListContent(filesList);
let allContent = compositeContent(filesContent);
let uniqueContent = unique(allContent);
let sorted = sortByTime(uniqueContent);
let sortedMath = setFloat(sorted);
let sortedMathEMA = batchCalculateEMA(sortedMath);
let sortedMathEMAMA = batchCalculateMA(sortedMathEMA);

let sortedMathEMAMA_wave = batchCalculateWave(sortedMathEMA);

let mapDataEMAMA = arrSwMap(sortedMathEMAMA);

//直接保存数组格式
let isSavedErr = saveData({
  sorted: sortedMathEMAMA,
  uniName: ".arr"
});
//保存map格式
let isSavedErrMap = saveData(
  {
    sorted: mapDataEMAMA,
    uniName: ".map"
  }
);
/*
* 保存 js 文件，方便 html 引用
* */
let isSavedErrJs = saveData(
  {
    sorted: sortedMathEMAMA,
    suffix: ".js",
    prifixContent: "let tickerData="
  }
);
/*
* 保存表格，必须传入map格式，并且 columns 对应
* */
//定义表格头 Excel
const columns = [
  {header: 'time', key: 'time'},
  {header: 'open', key: 'open'},
  {header: 'high', key: 'high'},
  {header: 'low', key: 'low'},
  
  {header: 'close', key: 'close'},
  {header: 'volumeByPaper', key: 'volumeByPaper'},
  {header: 'volume', key: 'volume'},
  
  {header: 'ema5', key: 'ema5'},
  {header: 'ema10', key: 'ema10'},
  {header: 'ema20', key: 'ema20'},
  {header: 'ema30', key: 'ema30'},
  
  {header: 'ma5', key: 'ma5'},
  {header: 'ma10', key: 'ma10'},
  {header: 'ma20', key: 'ma20'},
  {header: 'ma30', key: 'ma30'},
  
  {header: 'gain', key: 'gain'},
  {header: 'amplitude', key: 'amplitude'},
];
saveExcel({
  sorted: mapDataEMAMA,
  columns,
});
//定义表格头 csv
const fields = columns.map(item => item.header);
saveCSV({
  sorted: mapDataEMAMA,
  fields,
});
