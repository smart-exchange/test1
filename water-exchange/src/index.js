/*
* 瀑布交易策略
* */
const Koa = require('koa');
const static = require('koa-static');
const Router = require('koa-router'); // koa 路由中间件
const cors = require('koa2-cors');
const dataFactory = require("./core/dataFactory");
const core = require("./core/core");
const logNoter = require("./tool/logNoter");
const {pClient} = require('./config/okex-connector');
const {routerCustom} = require('./route');
const bodyParser = require('koa-bodyparser');

const router = new Router(); // 实例化路由
const app = new Koa();
app.use(bodyParser());

let port = 3010;
// 配置静态web服务的中间件
app.use(static(__dirname + '/www'));
// 接口允许跨域访问
app.use(cors({
  origin: function (ctx) {
    return "*"; // 允许来自所有域名请求
  },
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 5,
  credentials: true,
  allowMethods: ['GET', 'POST', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
//---------分割线---------

//只用前50个数据预测
let preResult = {};
/*
* 模拟每分钟预测一次 这里是测试数据每四秒就预测一次
* */
//实时行情，每分钟加一次
let showDataStack = [];
let dataInTime = [];
//预测数据
let tickerDataStack = [];
let tickerData = [];
let timer = null;


function exchange(tickerData) {
  preResult = core.getPriceInfo(tickerData);
  // logNoter.noteExchange({fileName: new Date().toISOString() + ".json", data: JSON.stringify(preResult)});
  dataInTime.push(showDataStack.shift());
}

function restart() {
  console.log("重新启动：");
  showDataStack = dataFactory.getData(false, true);
  tickerDataStack = dataFactory.getData(false, true);
  dataInTime = showDataStack.splice(0, 50);
}

/*
* 参数调整
* */
router.get('/pre', async (ctx, next) => {
  ctx.response.body = {
    preResult,
    dataInTime
  };
});
router.get('/start', async (ctx, next) => {
  restart();
  clearInterval(timer);
  //实时行情，每分钟加一次
  showDataStack = dataFactory.getData(false, true);
  dataInTime = showDataStack.splice(0, 50);
  //预测数据
  tickerDataStack = dataFactory.getData(false, true);
  tickerData = tickerDataStack.splice(0, 50);
  exchange(tickerData);
  timer = setInterval(() => {
    // 从开始截取后面50个
    tickerData.push(tickerDataStack.shift());
    tickerData.shift();
    exchange(tickerData);
    if (tickerDataStack.length <= 50) {
      restart();
    }
  }, 250);
  
  ctx.response.body = {
    res: "开始成功"
  };
});
router.get('/stop', async (ctx, next) => {
  clearInterval(timer);
  ctx.response.body = {
    res: "stop"
  };
});
router.get('/goon', async (ctx, next) => {
  clearInterval(timer);
  timer = setInterval(() => {
    // 从开始截取后面50个
    tickerData.push(tickerDataStack.shift());
    tickerData.shift();
    exchange(tickerData);
    if (tickerDataStack.length <= 50) {
      restart();
    }
  }, 250);
  ctx.response.body = {
    res: "goon"
  };
});
//获取要预测的数据
router.get('/getPreData', async (ctx, next) => {
  let data = dataFactory.getData(false, true);
  ctx.response.body = {
    data: data
  };
});

//---------分割线---------

/*
* 生产环境监控
* */
//最新的数据
let prodTickerArr = [];
let preResultArr = [];
let ins_id = "BTC-USD-SWAP";
/*
* new Date().toISOString() + 8
* 就可以得到当前的时间
* 比如 "2020-02-20T09:04:05.131Z"
*  代表中国时间 2020-02-20 17:04:05.131
* */
getStart50();

function getStart50() {
  pClient.swap().getCandles(ins_id, {
    start: new Date(new Date().getTime() - 1000 * 60 * 60).toISOString(),
    end: new Date(new Date().getTime() - 1000 * 60).toISOString(),
    granularity: "60",// 60 代表分钟级别
  }).then(res => {
    if (res && res.length > 0) {
      res.reverse();
      prodTickerArr = res;
    }
    for (let i = 0; i < 59; i++) {
      preResultArr.push({
        scoreTotal: 0,
        lastPrice: prodTickerArr[i]
      });
    }
    /*
    * 之后连续每分钟获取一条最新新数据
    * */
    saveTicker({
      ins_id,
      timeGap: 1,//秒数
    });
  });
}


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
  //三小时之前  ---  当前
  let start = new Date(new Date().getTime() - 1000 * 61).toISOString();
  let end = new Date().toISOString();
  // 获取k线数据，默认最近 200 条
  pClient.swap().getCandles(ins_id, {
    start,
    end,
    granularity: "60",// 60 代表分钟级别
  }).then(res => {
    console.log("-----------最新分钟行情---------");
    /*
    * 先检查数据是不是已经下载过得时间
    * */
    if (res && res.length > 0) {
      let rTime = res[0][0];
      let hasTime = prodTickerArr.find(item => rTime === item[0]);
      if (hasTime) {
        console.log("hasTime：" + hasTime);
        console.log("有重复数据，不更新时间，只替换");
        //为什么这里还需要更新，是因为一分钟内，行情数据在不断变化，需要用最新的数据替换之前一分钟的数据
        prodTickerArr.pop();
      }
    } else {
      console.log("没数据，不计算");
      return;
    }
    console.log("即将更新数据");
    if (res && res.length > 0) {
      prodTickerArr.push(res[0]);
    }
    console.log("最近三分钟：");
    prodTickerArr.map((item, index) => {
      if (index + 4 > prodTickerArr.length) {
        console.log(item[0])
      }
    });
    
    console.log("最近一分钟：");
    console.log(JSON.stringify(res));
    /*
    * 拉了数据之后，就预测
    * */
    let data50 = [];
    for (let i = prodTickerArr.length - 50; i < prodTickerArr.length; i++) {
      data50.push(prodTickerArr[i]);
    }
    let tickerData = dataFactory.getData(JSON.stringify(data50), true);
    let preResult = core.getPriceInfo(tickerData);
    delete preResult.detailReason;
    
    preResultArr.push(preResult);
    console.log("最新预测分值数量:" + preResultArr.length);
    
    /*
    * 如果程序不重新启动
    * preResultArr 每分钟就加一条，数据会越来越多，会被死掉
    * 这边做最多 500 条数据
    * */
    if (prodTickerArr.length > 500) {
      prodTickerArr.shift();
    }
    /*
    * 针对预测的分值，每秒会预测一次
    * 每秒钟行情与变化一次
    * */
    if (preResultArr.length > 500 * 60) {
      preResultArr.shift();
    }
    console.log("-----------++++++++---------");
  });
};

router.get('/getProd', async (ctx, next) => {
  //截取 prodTickerArr 后面50个
  if (prodTickerArr.length < 50) {
    ctx.response.body = {
      res: null,
      history: []
    };
  } else {
    ctx.response.body = {
      preResultArr,
      dataInTime: prodTickerArr
    };
  }
});

//---------分割线---------
/*
* 监控最近120分钟行情,不然页面比较卡顿
* */
router.get('/getProd120', async (ctx, next) => {
  //截取 prodTickerArr 后面50个
  if (prodTickerArr.length < 50) {
    ctx.response.body = {
      res: null,
      history: []
    };
  } else {
    if (prodTickerArr.length > 120) {
      ctx.response.body = {
        preResultArr: preResultArr.slice(prodTickerArr.length - 120, prodTickerArr.length),
        dataInTime: prodTickerArr.slice(prodTickerArr.length - 120, prodTickerArr.length)
      };
    } else {
      ctx.response.body = {
        preResultArr,
        dataInTime: prodTickerArr
      };
    }
  }
});


//---------分割线---------
app.use(router.routes())
.use(routerCustom.routes());

// 监听端口≈
app.listen(port, function () {
  console.log("浏览器查看实时监控页面:点击开始");
  console.log('http://localhost:' + port);
});
