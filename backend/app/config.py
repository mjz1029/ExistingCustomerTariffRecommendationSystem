import os
import sys

# 打包模式检测：PyInstaller 打包后 sys.frozen = True
if getattr(sys, 'frozen', False):
    # 打包模式：数据库放在可执行文件旁边
    APP_DIR = os.path.dirname(sys.executable)
    BASE_DIR = APP_DIR
else:
    # 开发模式：数据库放在 backend/ 目录
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'tariff.db')}"
