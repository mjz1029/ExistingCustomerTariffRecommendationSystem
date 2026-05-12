#!/usr/bin/env bash
# 一键启动脚本 — 同时启动后端和前端 (macOS / Linux)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

cleanup() {
    echo ""
    echo ">> 正在停止服务..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo ">> 已停止"
}
trap cleanup EXIT INT TERM

# ── 后端 ──────────────────────────────────────────────
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo ">> 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
echo ">> 安装后端依赖..."
pip install -q -r requirements.txt
deactivate

echo ">> 启动后端 (http://localhost:8000)"
"$BACKEND_DIR/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ── 前端 ──────────────────────────────────────────────
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo ">> 安装前端依赖..."
    npm install
fi

echo ">> 启动前端 (http://localhost:5173)"
npm run dev &
FRONTEND_PID=$!

# ── 等待 ──────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  存量用户套餐推荐系统 已启动"
echo ""
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:8000"
echo "  API:  http://localhost:8000/docs"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait
