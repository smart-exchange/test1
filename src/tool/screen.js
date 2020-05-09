//要翻墙，部署麻烦
// const puppeteer = require('puppeteer');
/*
* 另一个库
* 本地公司网络限制，也不方便部署
* 服务器比较部署比较方便,不过这个截取的样式有问题啊
* */
const webshot = require('node-webshot');

//把交易完整的图片保存，方便之后做数据分析
async function saveScreen () {
  const browser = await puppeteer.launch();
  // const browser = await puppeteer.launch({
  //   executablePath: './chromium/chrome.exe',
  //   headless: false
  // });
  const page = await browser.newPage();
  await page.goto('https://www.baidu.com/?tn=baiduhome_pg');
  await page.screenshot({path: 'baidu.png'});
  browser.close();
};

async function saveScreen2 () {
  webshot('https://www.baidu.com/?tn=baiduhome_pg', 'baidu.png', function(err) {
    // screenshot now saved to google.png
    console.log(err)
  });
};
module.exports.screen = saveScreen2;
module.exports.screen = saveScreen;
