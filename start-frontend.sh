#!/usr/bin/env bash
# 前端启动脚本 (macOS / Linux)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

cd "$FRONTEND_DIR"

# 1. 安装依赖（如果 node_modules 不存在）
if [ ! -d "node_modules" ]; then
    echo ">> 安装前端依赖..."
    npm install
fi

# 2. 启动开发服务器
echo ">> 启动前端开发服务器 (http://localhost:5173)"
echo ">> 按 Ctrl+C 停止"
echo ""
npm run dev
