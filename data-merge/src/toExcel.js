const Excel = require('exceljs');


function toSwichExcel(options) {
  let {fileName, columns, data} = options;
  console.log("保存表格数据条数：" + data.length);
  const start_time = new Date();
  const workbook = new Excel.stream.xlsx.WorkbookWriter({
    filename: fileName
  });
  //添加表
  const worksheet = workbook.addWorksheet('Sheet');
  //定义表格
  worksheet.columns = columns;
  const length = data.length;
  // 当前进度
  const time_monit = 400;
  let temp_time = Date.now();
  let current_num = 0;
  console.log('开始添加数据');
  // 开始添加数据
  data.map((item, i) => {
    worksheet.addRow(item).commit();
    current_num = i;
    if (Date.now() - temp_time > time_monit) {
      temp_time = Date.now();
      console.log((current_num / length * 100).toFixed(2) + '%');
    }
  });
  workbook.commit();
  const end_time = new Date();
  const duration = end_time - start_time;
  console.log('用时（毫秒）：' + duration);
  console.log("程序执行完毕");
}

module.exports.toSwichExcel = toSwichExcel;
