@echo off
chcp 65001 >nul 2>&1
:: 后端启动脚本 (Windows)

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend

cd /d "%BACKEND_DIR%"

:: 1. 创建虚拟环境
if not exist "venv" (
    echo >> 创建 Python 虚拟环境...
    python -m venv venv
)

:: 2. 激活虚拟环境
call venv\Scripts\activate.bat

:: 3. 安装依赖
echo >> 安装后端依赖...
pip install -q -r requirements.txt

:: 4. 启动
echo >> 启动后端服务 (http://localhost:8000)
echo >> API 文档: http://localhost:8000/docs
echo >> 按 Ctrl+C 停止
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
