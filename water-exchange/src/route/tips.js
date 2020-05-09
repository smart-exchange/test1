const Router = require('koa-router'); // koa 路由中间件
const {pClient, aClient} = require('../config/okex-connector');
let conditions = ["小于", "小于等于", "大于", "大于等于", "等于", "区间"];
//这是列表
// obj =  {
//   name: "测试1",
//   //值
//   value: 368,
//   //是否匹配
//   isMatch: false,
//   //条件
//   condition: "小于",
//   //币种
//   type: "EOS",
// }
let tipsList = [
];
let currentValueBtc = 0;
let currentValueEos = 0;

async function btcintime() {
  let ins_id = "BTC-USD-SWAP";
  let res = await pClient.swap().getTicker(ins_id);
  //仓位信息
  let resA = await aClient.swap().getPosition(ins_id);
  let holding = resA.holding;
  let priceInfo = {
    time: res.timestamp,
    price: parseFloat(res.last)
  };
  if (holding && holding.length === 2) {
    priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0
    priceInfo.shortPrice = holding && holding[1] && holding[1].avg_cost || 0
  } else if (holding && holding.length === 1) {
    if (holding[0].side === "long") {
      priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0;
      priceInfo.shortPrice = 0
    } else {
      priceInfo.longPrice = 0;
      priceInfo.shortPrice = holding && holding[0] && holding[0].avg_cost || 0
    }
  } else {
    priceInfo.longPrice = 0
    priceInfo.shortPrice = 0
  }
  return priceInfo;
}

async function eosintime() {
  let ins_id = "EOS-USD-SWAP";
  let res = await pClient.swap().getTicker(ins_id);
  //仓位信息
  let resA = await aClient.swap().getPosition(ins_id);
  let holding = resA.holding;
  let priceInfo = {
    time: res.timestamp,
    price: parseFloat(res.last)
  };
  if (holding && holding.length === 2) {
    priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0
    priceInfo.shortPrice = holding && holding[1] && holding[1].avg_cost || 0
  } else if (holding && holding.length === 1) {
    if (holding[0].side === "long") {
      priceInfo.longPrice = holding && holding[0] && holding[0].avg_cost || 0;
      priceInfo.shortPrice = 0
    } else {
      priceInfo.longPrice = 0;
      priceInfo.shortPrice = holding && holding[0] && holding[0].avg_cost || 0
    }
  } else {
    priceInfo.longPrice = 0
    priceInfo.shortPrice = 0
  }
  return priceInfo;
}

function setListValue() {
  console.log(currentValueEos)
  console.log(currentValueBtc)
  tipsList.map(item => {
    if (item.type === "EOS") {
      item.price=currentValueEos;
      //根据描述比较得分
      switch (item["condition"]) {
        case "小于": {
          item.isMatch = (currentValueEos < item.value);
          break
        }
        case "小于等于": {
          item.isMatch = (currentValueEos <= item.value);
          break
        }
        case "大于": {
          item.isMatch = (currentValueEos > item.value);
          break
        }
        case "大于等于": {
          item.isMatch = (currentValueEos >= item.value);
          break
        }
        case "等于": {
          item.isMatch = (item.value === currentValueEos);
          break
        }
      }
    } else if (item.type === "BTC") {
      item.price=currentValueBtc;
      //根据描述比较得分
      switch (item["condition"]) {
        case "小于": {
          item.isMatch = (currentValueBtc < item.value);
          break
        }
        case "小于等于": {
          item.isMatch = (currentValueBtc <= item.value);
          break
        }
        case "大于": {
          item.isMatch = (currentValueBtc > item.value);
          break
        }
        case "大于等于": {
          item.isMatch = (currentValueBtc >= item.value);
          break
        }
        case "等于": {
          item.isMatch = (item.value === currentValueBtc);
          break
        }
      }
    }
    
  })
}

/*
* 实时获取价格
* 设置价格
* */
setInterval(async () => {
  let bPrice = await btcintime();
  currentValueBtc = bPrice.price;
  let ePrice = await eosintime();
  currentValueEos = ePrice.price;
  setListValue();
}, 1000);


// 路由配置
const router = new Router(
  {
    prefix: "/tips"
  }
);
router
.post('/add', async (ctx, next) => {
//添加列表
  let data = ctx.request.body;
  console.log(data)
  let value = parseFloat(data.value);
  let condition = data.condition;
  let name = data.name;
  let hasName =  tipsList.find(item=>item.name===name)
  if(hasName){
    //根据 name 删除
    ctx.response.body = {
      list: tipsList
    };
    return
  }
  let type = data.type;
  let obj = {
    name,
    value,
    condition,
    type
  };
  tipsList.push(obj);
  setListValue();
  //根据 name 删除
  ctx.response.body = {
    list: tipsList
  };
})
.post('/deleteByName', async (ctx, next) => {
//删除列表
  let data = ctx.request.body;
  let name = data.name;
  tipsList = tipsList.filter(item => item.name !== name);
  setListValue();
  //根据 name 删除
  ctx.response.body = {
    list: tipsList
  };
})
.get('/list', async (ctx, next) => {
  setListValue();
  //返回全部列表
  ctx.response.body = {
    list: tipsList
  };
});

module.exports.router = router;

