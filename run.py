"""
存量用户套餐推荐系统 — 打包入口
双击运行后自动打开浏览器访问 http://localhost:8000
"""
import os
import sys
import time
import webbrowser
import threading
import socket


def find_free_port(default=8000):
    """查找可用端口"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', default))
            return default
        except OSError:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]


def open_browser(port, delay=1.5):
    """延迟打开浏览器"""
    time.sleep(delay)
    webbrowser.open(f'http://127.0.0.1:{port}')


def get_frontend_dir():
    """获取前端静态文件目录"""
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包模式
        base = sys._MEIPASS
    else:
        # 开发模式
        base = os.path.dirname(os.path.abspath(__file__))

    # 检查构建产物目录
    for candidate in ['frontend_dist', 'dist']:
        d = os.path.join(base, candidate)
        if os.path.isdir(d) and os.path.exists(os.path.join(d, 'index.html')):
            return d

    return None


def main():
    port = find_free_port()

    # 设置环境变量告知 main.py 端口和前端目录
    os.environ['APP_PORT'] = str(port)

    frontend_dir = get_frontend_dir()
    if frontend_dir:
        os.environ['FRONTEND_DIR'] = frontend_dir

    # 在后台线程打开浏览器
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # 启动 FastAPI
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    main()
