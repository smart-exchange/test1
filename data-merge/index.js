/*
* 瀑布交易策略
* */
const Koa = require('koa');
const static = require('koa-static');
const Router = require('koa-router'); // koa 路由中间件
const cors = require('koa2-cors');
const bodyParser = require('koa-bodyparser');
const router = new Router(); // 实例化路由
const app = new Koa();
app.use(bodyParser());
let port = 3012;
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

app.use(router.routes());

// 监听端口≈
app.listen(port, function () {
  console.log("历史数据");
  console.log('http://localhost:' + port);
});
