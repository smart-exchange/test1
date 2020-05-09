const {parse} = require('json2csv');
const fs = require('fs');

function toCSV(options) {
  let {data, fields, fileName} = options;
  const opts = {fields};
  try {
    const csv = parse(data, opts);
    let res = fs.writeFileSync(fileName, csv);
    if (res) {
      console.error("保存 csv 错误");
      console.log(res)
    }
  } catch (err) {
    console.error(err);
  }
  
}


module.exports.toCSV = toCSV;
