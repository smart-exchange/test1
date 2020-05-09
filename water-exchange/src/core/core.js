/*
* 策略核心逻辑
* */
/*
* 暴跌点预测分钟级别
* 只做预测，不下单，下单还需要设置间隔，不能连续下单
* 分析分钟级别 20 分钟内的数据
* 1.每一条行情数据，统一格式
* [时间，开盘，最高，最低，收盘，交易量(按照合约数量), 交易量(按照币个数)，MA5, MA10, MA20, MA30]
* */


/*
* 最后得的分数
* 根据得分的高低，判断当前时刻是否是下单的最佳时机
* */
const basicScore = 6;

/*
* 基本配置
* */
const configBasic = {
  /*
* 每分钟交易量
* */
  perVolume: 30,
  /*
* 行情数据量，可以设置为更大
* */
  lengthBasic: 20
};
/*
* 参数比较模型
* 如果这些参数都满足
* 这些参数可以调节
* @ wight 权重 1-10 数字越大说明参数越重要
* @ value 基础值 类型是数值，如果不是也想办法转为数字
* @ compareDesc 比较描述 【小于，小于等于，大于，大于等于，等于，区间】
* @ validor 执行比较器
* 区间定为左闭右闭区间；
* 如果只会还有其他区间的，可以另外加
* 如果不满足条件，则不加值，且说明原因
* */
const paramsBasic = {
  /*
  * 阳阴线比例（阳/阴）
  * */
  highLowRateBasic: {
    name: "阳阴线比例（阳/阴）",
    value: 0.539,
    wight: 8,
    compareDesc: "小于等于",
    validor: (tickerData) => {
      let yang = 0, ying = 0;
      tickerData.map(item => {
        if (item[1] - item[4] > 0) {
          ying++
        } else {
          yang++
        }
      });
      return yang / ying;
    }
  },
  /*
  * 阴阳线比例（阴/阳）
  * */
  lowHighRateBasic: {
    name: "阴阳线比例（阴/阳）",
    value: 1,
    wight: -8,
    compareDesc: "小于等于",
    validor: (tickerData) => {
      let yang = 0, ying = 0;
      tickerData.map(item => {
        if (item[1] - item[4] > 0) {
          ying++
        } else {
          yang++
        }
      });
      return ying/yang ;
    }
  },
  /*
  * 交易量总数
  * */
  volumeAllBasic: {
    name: "交易量总数",
    value: configBasic.perVolume * configBasic.lengthBasic,
    wight: 1,
    compareDesc: "大于",
    validor: (tickerData) => {
      let total = 0;
      tickerData.map(item => {
        total += item[6];
      });
      return total;
    }
  },
  /*
  * 梯度下降率(最低价)
  * (上一次最低-本次最低) > 0 得比例，总共19次比较，
  * */
  gradFallLowestRate: {
    name: "梯度下降率(最低价)",
    value: 0.6,
    wight: 6,
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item, index) => {
        if (index > 0) {
          if (tickerData[index - 1][3] - tickerData[index][3] >= 0) {
            okTimes++;
          }
        }
      });
      return okTimes / (tickerData.length - 1);
    }
  },
  /*
  * 梯度下降率(最高)
  * (上一次最高-本次最高) > 0 得比例，总共19次比较，
  * 下降的总次数 / 19  > 0.79
  * */
  gradFallHighestRate: {
    name: "梯度下降率(最高)",
    value: 0.79,
    wight: 6,
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item, index) => {
        if (index > 0) {
          if (tickerData[index - 1][2] - tickerData[index][2] >= 0) {
            okTimes++;
          }
        }
      });
      return okTimes / (tickerData.length - 1);
    }
  },
  /*
   * 交易量比率200
   * 交易量大于 200 的比例
   * */
  volumeHighestRate: {
    name: "交易量比率200",
    value: 0.1,
    wight: 1,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item) => {
        if (item[6] > 200) {
          okTimes++
        }
      });
      return okTimes / (tickerData.length);
    }
  },
  /*
  * 交易量比率100
  * 交易量大于 100 的比例
  * */
  volumeHighRate: {
    name: "交易量比率100",
    value: 0.2,
    wight: 1,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item) => {
        if (item[6] > 100) {
          okTimes++
        }
      });
      return okTimes / (tickerData.length);
    }
  },
  /*
   * 交易量比率20
   * 交易量小于 20 的比例
   * */
  volumeLowerRate: {
    name: "交易量比率20",
    value: 0.25,
    wight: 2,
    compareDesc: "小于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item) => {
        if (item[6] < 20) {
          okTimes++
        }
      });
      return okTimes / (tickerData.length);
    }
  },
  /*
  * 低波动比率
  * 波动大于等于0.002，的比例，(最高-最低) / ((开+收)/2)
  * 波动大于0.002次数 / 20 > 0.25，
  * */
  lowerWaveRate: {
    name: "低波动比率",
    value: 0.25,
    wight: 1,
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item) => {
        if ((item[2] - item[3]) / ((item[1] + item[4]) / 2) >= 0.002) {
          okTimes++
        }
      });
      return okTimes / (tickerData.length);
    }
  },
  /*
  * 大波动比率
  * 波动大于等于 0.01，的比例，(最高-最低)/((开+收)/2)
  * 波动大于0.01次数 / 20 > 0.05，
  * */
  higherWaveRate: {
    name: "大波动比率",
    value: 0.05,
    wight: 4,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item) => {
        if ((item[2] - item[3]) / ((item[1] + item[4]) / 2) >= 0.01) {
          okTimes++
        }
      });
      return okTimes / (tickerData.length);
    }
  },
  /*
  * 拒绝波动
  * (最高-最低)/((开+收)/2)> 0.04，则不要买入
  * */
  rejectWave: {
    name: "拒绝波动",
    value: 0.03,
    wight: -20,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let maxWave = 0;
      for (let i = 0; i < tickerData.length; i++) {
        let item = tickerData[i];
        let wave = (item[2] - item[3]) / ((item[1] + item[4]) / 2);
        if (wave > maxWave) {
          maxWave = wave;
        }
        if (wave >= 0.04) {
          return wave;
        }
      }
      return maxWave;
    }
  },
  /*
  * 均线展开比率
  * ma5-ma10<0 && ma10-ma20<0 && ma20-ma30<0  计算20次 都为 true 的比率
  * */
  maOpenRate: {
    name: "均线展开比率",
    value: 0.7,
    wight: 8,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      let okTimes = 0;
      tickerData.map((item) => {
        let m1 = item[7] - item[8] < 0;
        let m2 = item[8] - item[9] < 0;
        let m3 = item[9] - item[10] < 0;
        if (m1 && m2 && m3) {
          okTimes++
        }
      });
      return okTimes / (tickerData.length);
    }
  },
  /*
  * 均线下降平滑率
  * 下降得越平滑，就越是爆发点
  * todo
  * */
  maDownSmooth: {
    name: "均线下降平滑率",
    value: 0.7,
    wight: 1,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      return 0;
    }
  },
  /*
  * 上涨大波动
  * 如果有上涨大波动需要为负数
  * todo
  * */
  upWave: {
    name: "上涨大波动",
    value: 0.7,
    wight: 1,//权重调节
    compareDesc: "大于等于",
    validor: (tickerData) => {
      return 0;
    }
  },
};

/*
* 获取预测信息
* tickerData 行情数据 分钟级别数据 ，20条数据
* 1.每一条行情数据，统一格式
* [时间，开盘，最高，最低，收盘，交易量(按照合约数量), 交易量(按照币个数)，MA5, MA10, MA20, MA30]
* */
function getPriceInfo(tickerData) {
  //总的策略得分
  let scoreTotal = 0;
  //判定交易理由
  let detailReason = [];
  //预测的目标价格
  let targetPrice = tickerData[tickerData.length - 1];
  //返回的结果
  let result = null;
  /*
  * 遍历参数对象，计算得分
  * */
  Object.keys(paramsBasic).map(paramKey => {
    let condition = paramsBasic[paramKey];
    let factorValue = 0;
    for (let key in condition) {
      if (key === "compareDesc") {
        //计算得分
        factorValue = (condition["validor"](tickerData)).toFixed(3);
        let reason = null;
        //根据描述比较得分
        switch (condition[key]) {
          case "小于": {
            if (factorValue < condition.value) {
              scoreTotal += (condition.wight);
              // scoreTotal += (condition.wight * factorValue);
              reason = getReason(condition, 1, factorValue);
            } else {
              reason = getReason(condition, 0, factorValue);
            }
            break
          }
          case "小于等于": {
            if (factorValue <= condition.value) {
              scoreTotal += (condition.wight);
              // scoreTotal += (condition.wight * factorValue);
              reason = getReason(condition, 1, factorValue);
            } else {
              reason = getReason(condition, 0, factorValue);
            }
            break
          }
          case "大于": {
            if (factorValue > condition.value) {
              scoreTotal += (condition.wight);
              // scoreTotal += (condition.wight * factorValue);
              reason = getReason(condition, 1, factorValue);
            } else {
              reason = getReason(condition, 0, factorValue);
            }
            break
          }
          case "大于等于": {
            if (factorValue >= condition.value) {
              scoreTotal += (condition.wight);
              // scoreTotal += (condition.wight * factorValue);
              reason = getReason(condition, 1, factorValue);
            } else {
              reason = getReason(condition, 0, factorValue);
            }
            break
          }
          case "等于": {
            if (factorValue === condition.value) {
              scoreTotal += (condition.wight);
              // scoreTotal += (condition.wight * factorValue);
              reason = getReason(condition, 1, factorValue);
            } else {
              reason = getReason(condition, 0, factorValue);
            }
            break
          }
          case "区间": {
            if (factorValue >= condition.value[0] && factorValue <= condition.value[1]) {
              scoreTotal += (condition.wight);
              // scoreTotal += (condition.wight * factorValue);
              reason = getReason(condition, 1, factorValue);
            } else {
              reason = getReason(condition, 0, factorValue);
            }
            break
          }
        }
        detailReason.push(reason);
      }
    }
  });
  if (scoreTotal >= basicScore) {
    result = {
      pre: true,
      tickerData,
      detailReason: detailReason,
      lastPrice: targetPrice,
      scoreTotal,
      des: "可卖出，" + "通过前" + tickerData.length + "条数据计算",
    };
    console.log("预测目标价格"+targetPrice)
  } else {
    result = {
      pre: false,
      tickerData,
      detailReason: detailReason,
      lastPrice: targetPrice,
      scoreTotal,
      des: "不可卖出，" + "通过前" + tickerData.length + "条数据计算",
    };

  }
  return result;
};

/*
* 获取理由描述
* */
function getReason(condition, isOk, factorValue) {
  let ok = {
    name: condition["name"],
    factorValue,
    des: factorValue + " 满足条件: " + condition["compareDesc"] + " " + condition["value"],
  };
  let err = {
    name: condition["name"],
    factorValue,
    des: factorValue + " 不满足条件: " + condition["compareDesc"] + " " + condition["value"],
  };
  return isOk ? ok : err;
}

/*
* 导出模块
* */
module.exports.getPriceInfo = getPriceInfo;
