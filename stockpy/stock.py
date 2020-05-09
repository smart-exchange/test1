#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2020/2/26 21:48
# @Author  : Zhou
# @File    : stock.py
# @Software: win8.1 python3.7.0 numpy1.17.0rc2 matplotlib 2.2.3 scipy 1.1.0

"""
需要安装 matplotlib  numpy  scipy，其中 scipy 依赖 numpy，需要先安装 numpy
pip3 install matplotlib
pip3 install numpy
pip install scipy
"""

from matplotlib import pyplot as plt
import numpy as np
import csv, math
from scipy import signal

# 读取数据
def loadData(filePath):
    """读取的文件尾csv文件，文件只有2列数据， 返回值数据类型为二维数组"""
    with open(filePath, 'r') as csvfile:
        reader = csv.reader(csvfile)
        data = []
        # 将字符串转为float
        for line in reader:
            str2float = []
            for i in range(len(line)):
                element = float(line[i])
                str2float.append(element)
            data.append(str2float)
    data_array = np.array(data)
    return data_array


# 取出开盘价
def openVals(data, beginPoint, pointNum=20):
    """
    :param data: 二维数组
    :param beginPoint: 起始点的开盘价
    :param pointNum: 20
    :return: 开盘价，数据类型为一维数组
    """
    Y_open = data[:, 0][beginPoint: beginPoint + 20]
    return Y_open


def closeVals(data, beginPoint, pointNum=20):
    """
    :param data:
    :param beginPoint:
    :param pointNum:
    :return: 收盘价，数据类型为一维数组
    """
    Y_close = data[:, 1][beginPoint: beginPoint + 20]
    return Y_close


# 计算曲线的多项式表达式，最高次项是20次
def polyFunction(X, Y, order=15):
    """
    :param X:横坐标：0-20，一维数组
    :param Y:纵坐标，一维数组
    :param order:多项式阶数
    :return:曲线的拟合值，一维数组
    """
    func_coef = np.polyfit(X, Y, order)
    func_equation = np.poly1d(func_coef)
    yvals = func_equation(X)
    return yvals


# 计算所有相邻波峰值的变化率，求和,计算平滑度, 20个点
def smoothRate(Y, num=20):
    """
    :param Y:一维数组
    :param num: 20个点
    :return: 两种平滑度，一种是相邻波峰(谷)的变化率求和,为正表示涨，为负跌；
                        另一种是(1-极值点个数/20)，越大越稳定
    """
    extreMax_ValueInd = signal.argrelextrema(Y, np.greater, order=1)
    extreMin_ValueInd = signal.argrelextrema(Y, np.less, order=1)
    # 进行判断，极大值点个数大于1
    extreMaxsmooth = 0
    if len(extreMax_ValueInd[0]) > 1:
        for i in range(len(extreMax_ValueInd[0]) - 1):
            # 计算所有相邻波峰值的变化率
            extreMaxsmooth += (Y[extreMax_ValueInd[0][i + 1]] - Y[extreMax_ValueInd[0][i]]) \
                              / (extreMax_ValueInd[0][i + 1] - extreMax_ValueInd[0][i])
        # print('extreMaxsmooth is :',extreMaxsmooth)
    else:
        print('The number of extreMaxsmooth is only one')

    #    # 进行判断，极小值点个数大于1
    extreMinsmooth = 0
    if len(extreMin_ValueInd[0]) > 1:
        for i in range(len(extreMin_ValueInd[0]) - 1):
            # 计算所有相邻波谷值的变化率
            extreMinsmooth += (Y[extreMin_ValueInd[0][i + 1]] - Y[extreMin_ValueInd[0][i]]) \
                              / (extreMin_ValueInd[0][i + 1] - extreMin_ValueInd[0][i])
        # print('extreMinsmooth is :', extreMinsmooth)
    else:
        print('The number of extreMinsmooth is only one')

    # sooth_rate =1-极值点个数/20
    extreTotalsmooth = np.round(extreMaxsmooth + extreMinsmooth, 2)
    extreMax = len(extreMax_ValueInd[0])
    extreMin = len(extreMin_ValueInd[0])
    print('extreTotalsmooth is :', np.round(extreTotalsmooth, 2))
    print('the number of extreMax is :', extreMax)
    print('the number of extreMin is :', extreMin)

    # 此处极值个数判定平滑度，可以作对比
    extremeValue_num = len(extreMax_ValueInd[0]) + len(extreMin_ValueInd[0])
    smooth_rate = 1 - extremeValue_num / num
    print('smooth_rate is :', smooth_rate)

    return extreTotalsmooth, smooth_rate, extreMax, extreMin


# 正交回归
def line_angle(X, Y):
    """
    :param X:一维数组，0-20
    :param Y: 一维数组，纵坐标
    :return: 直线的斜率以及截距
    """
    X = np.array(X)
    Y = np.array(Y)
    Xmeans = X.mean()
    Ymeans = Y.mean()
    S_xy = (X * Y).sum()
    S_xx = (X * (X - Xmeans)).sum()
    S_yy = (Y * (Y - Ymeans)).sum()
    delta = (S_xx - S_yy) ** 2 + 4 * S_xy ** 2
    # 计算斜率
    theta1 = (-(S_xx - S_yy) + math.sqrt(delta)) / (2 * S_xy)
    theta2 = (-(S_xx - S_yy) - math.sqrt(delta)) / (2 * S_xy)
    # theta2 = -1/theta1
    # 计算截距
    b1 = Ymeans - theta1 * Xmeans
    b2 = Ymeans - theta2 * Xmeans

    return theta1, b1, theta2, b2


# 画出轨道
def plotTrack(data, beginPoint, pointNum):
    """
    :param data: 二维数组，开盘价、收盘价
    :param beginPoint: 起始点
    :param pointNum: 20个点
    :return:
    """
    X = [i for i in range(20)]
    X = np.array(X)
    Y_open = openVals(data, beginPoint, pointNum)
    Y_close = closeVals(data, beginPoint, pointNum)
    theta1, b1, theta2, b2 = line_angle(X, Y_open)

    dist_Total1 = abs(Y_open - theta1 * X - b1).sum() / math.sqrt(1 + theta1 ** 2)
    dist_Total2 = abs(Y_open - theta2 * X - b2).sum() / math.sqrt(1 + theta2 ** 2)
    # print("distance Total_theta1 is :%d\ndistance Total_theta2 is :%d" % (dist_Total1, dist_Total2))
    X_2 = np.append(X, X);
    Y_2 = np.append(Y_open, Y_close)
    low_point = [];
    over_point = []
    distLow_point = 0;
    distOver_point = 0
    # 进行判断，取总距离小的斜率
    if dist_Total1 < dist_Total2:
        theta = theta1
        for i in range(40):
            if Y_2[i] < theta1 * X_2[i] + b1:
                if distLow_point < abs(Y_2[i] - theta1 * X_2[i] - b1) / math.sqrt(1 + theta1 ** 2):
                    distLow_point = abs(Y_2[i] - theta1 * X_2[i] - b1) / math.sqrt(1 + theta1 ** 2)
                    low_point.extend((X_2[i], Y_2[i]))
            else:
                if distOver_point < abs(Y_2[i] - theta1 * X_2[i] - b1) / math.sqrt(1 + theta1 ** 2):
                    distOver_point = abs(Y_2[i] - theta1 * X_2[i] - b1) / math.sqrt(1 + theta1 ** 2)
                    over_point.extend((X_2[i], Y_2[i]))
        # print('the lowest distance is :', distLow_point, low_point[-2], )
        # print('the over most distace is :', distOver_point, over_point[-2])
        print('the theta is : ', theta)
        print('the width is : ', distLow_point + distOver_point)
        b1_low = low_point[-1] - theta1 * low_point[-2]
        b1_over = over_point[-1] - theta1 * over_point[-2]

        # plotBoundary(X, Y_open, theta, b1_over, b1_low, pointNum)
        # fig = plt.figure()
        # plt.plot(X, Y, 'o', mfc='none')
        # plt.plot(X, theta1 * X + b1, label='theta1='+str(theta1), mfc='none')
        # plt.plot(X, theta1 * X + b1_over, label='theta1', mfc='none')
        # plt.plot(X, theta1 * X + b1_low, label='theta1', mfc='none')
        # plt.legend()
        # plt.show()
        # distance = abs(Y - theta1 * X - b1)/math.sqrt(1+theta1**2)
        # distMove_Ind = distance.argmax()
        # b1_1 = Y[distMove_Ind]-theta1*X[distMove_Ind]
        # print('distance is :', distMove_Ind)

    else:
        theta = theta2
        for i in range(40):
            if Y_2[i] < theta2 * X_2[i] + b2:
                if distLow_point < abs(Y_2[i] - theta2 * X_2[i] - b2) / math.sqrt(1 + theta2 ** 2):
                    distLow_point = abs(Y_2[i] - theta2 * X_2[i] - b2) / math.sqrt(1 + theta2 ** 2)
                    low_point.extend((X_2[i], Y_2[i]))
            else:
                if distOver_point < abs(Y_2[i] - theta2 * X_2[i] - b2) / math.sqrt(1 + theta2 ** 2):
                    distOver_point = abs(Y_2[i] - theta2 * X_2[i] - b2) / math.sqrt(1 + theta2 ** 2)
                    over_point.extend((X_2[i], Y_2[i]))
        # print('the lowest distance is :', distLow_point, low_point[-2], )
        # print('the over most distace is :', distOver_point, over_point[-2])
        print('the theta is : ', theta)
        print('the width is : ', distLow_point + distOver_point)

        b2_low = low_point[-1] - theta2 * low_point[-2]
        b2_over = over_point[-1] - theta2 * over_point[-2]

        # plotBoundary(X, Y_open, theta, b2_over, b2_low, pointNum)

    Y_values = polyFunction(X, Y_open)
    extreTotalsmooth, smooth_rate, extreMax, extreMin = smoothRate(Y_values)

    return [theta, distLow_point + distOver_point, smooth_rate, extreTotalsmooth, extreMax, extreMin]


# 画图界限函数
def plotBoundary(X, Y, theta, b_over, b_low, pointNum):
    # fig = plt.figure(figsize=(10, 6))
    # plt.plot(X, Y, 'o', mfc='none')
    width = np.round(abs(b_over - b_low) / math.sqrt(1 + theta ** 2), 2)
    plt.plot(X, theta * X + b_over, label='theta=' + str(np.round(theta, 2)))
    plt.plot(X, theta * X + b_low, label='width=' + str(width))

    plt.xticks(np.arange(0, pointNum, ))
    plt.xlabel('time')
    plt.ylabel('price')
    plt.grid(True)
    plt.legend()
    plt.show()


# 画出条形图
def Plot_K(data, beginPoint, pointNum=20):
    fig = plt.figure(1, figsize=(10, 6), frameon=True)
    for i in range(beginPoint * 0, beginPoint * 0 + pointNum):
        time = [i, i]
        plt.plot(time, data[i + beginPoint], color='r', linewidth=4, )
    return plotTrack(data, beginPoint, pointNum)


def getAllValueByData(beginPoint):
    data_array = loadData('data2.csv')
    pointNum = 20
    theta_width_arr = Plot_K(data_array, beginPoint, pointNum)
    print("宽度，角度，顺滑率，相邻波峰(谷)的变化率，极大值和的个数，极小值的个数")
    print(theta_width_arr)
    return theta_width_arr;


# getAllValueByData(20);
# import stock
# print(stock.getAllValueByData(30))
"""
1.有些函数你用的全局变量，而不是把变量通过参数传入函数
比如 plotBoundary() 的变量，差一个 pointNum

2.你把计算值结果计算出来了，直接在函数里面打印，而没有使用返回值的形式
这是一个不好的习惯，要多用 return，除了入口函数，大多数函数应该是有返回值的
因为输入参数，就是想得到一个结果
"""
