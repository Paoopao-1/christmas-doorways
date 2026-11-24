"""本地预览服务器：只提供本项目目录，只监听本机，并禁止浏览器缓存（修改后刷新即可看到最新版本）。

用法：python3 serve.py        然后打开 http://localhost:5173
"""
import http.server
import os
import socketserver

PORT = 5173
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # 与线上 vercel.json 一致：/gift/<id> 返回首页，由前端路由处理
        if self.path.startswith("/gift/"):
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
    print(f"圣诞之门 预览：http://localhost:{PORT}  （目录：{ROOT}）")
    httpd.serve_forever()
