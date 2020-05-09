from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import stock

data = {'result': 'this is a test'}
host = ('0.0.0.0', 3011)

# 127.0.0.1 只能本地访问
"""
在服务器启动这个服务(在本地电脑也可以，只是不能公网访问)
然后可通过 http://ip:8888?beginPoint=23 访问
"""

class Resquest(BaseHTTPRequestHandler):
    def do_GET(self):
        print(self.path)
        # http://localhost:8888/34?beginPoint=23 获取路由的参数
        beginPointArr = self.path.split("beginPoint=")
        try:
            beginPoint = int(beginPointArr[1])
        except:
            beginPoint = 0
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        resData = {
            "beginPoint": beginPoint,
            "result": stock.getAllValueByData(beginPoint),
            "desc": "宽度，角度，顺滑率，相邻波峰(谷)的变化率，极大值和的个数，极小值的个数"
        }
        self.wfile.write(json.dumps(resData).encode())
        # self.wfile.write(json.dumps(data).encode())


if __name__ == '__main__':
    server = HTTPServer(host, Resquest)
    print("Starting server, listen at: %s:%s" % host)
    server.serve_forever()
