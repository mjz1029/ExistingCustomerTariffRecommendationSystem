#!/usr/bin/env bash
# 后端启动脚本 (macOS / Linux)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

cd "$BACKEND_DIR"

# 1. 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo ">> 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 2. 激活虚拟环境
source venv/bin/activate

# 3. 安装依赖
echo ">> 安装后端依赖..."
pip install -q -r requirements.txt

# 4. 启动服务
echo ">> 启动后端服务 (http://localhost:8000)"
echo ">> API 文档: http://localhost:8000/docs"
echo ">> 按 Ctrl+C 停止"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
