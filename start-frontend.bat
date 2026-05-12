@echo off
chcp 65001 >nul 2>&1
:: 前端启动脚本 (Windows)

set SCRIPT_DIR=%~dp0
set FRONTEND_DIR=%SCRIPT_DIR%frontend

cd /d "%FRONTEND_DIR%"

:: 1. 安装依赖
if not exist "node_modules" (
    echo >> 安装前端依赖...
    npm install
)

:: 2. 启动
echo >> 启动前端开发服务器 (http://localhost:5173)
echo >> 按 Ctrl+C 停止
echo.
npm run dev
