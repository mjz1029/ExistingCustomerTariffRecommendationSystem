@echo off
chcp 65001 >nul 2>&1
:: 一键启动脚本 — 同时启动后端和前端 (Windows)
:: 需要两个命令行窗口

set SCRIPT_DIR=%~dp0

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   存量用户套餐推荐系统 启动器
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: 在新窗口启动后端
echo >> 启动后端...
start "后端 - 套餐推荐系统" cmd /k "cd /d %SCRIPT_DIR% && call start-backend.bat"

:: 等待 3 秒让后端先启动
timeout /t 3 /nobreak >nul

:: 在新窗口启动前端
echo >> 启动前端...
start "前端 - 套餐推荐系统" cmd /k "cd /d %SCRIPT_DIR% && call start-frontend.bat"

echo.
echo   前端: http://localhost:5173
echo   后端: http://localhost:8000
echo   API:  http://localhost:8000/docs
echo.
echo   关闭各自的命令行窗口即可停止服务
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
