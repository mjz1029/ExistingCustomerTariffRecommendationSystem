#!/bin/bash
# ─────────────────────────────────────────────
# 存量用户套餐推荐系统 — macOS 本地打包脚本
# 用法: ./build.sh
# ─────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "══════════════════════════════════════════"
echo "  存量用户套餐推荐系统 — macOS 构建"
echo "══════════════════════════════════════════"

# ① 安装前端依赖 & 构建
echo ""
echo "▸ [1/4] 构建前端..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd ..
echo "  ✓ 前端构建完成 → frontend/dist/"

# ② 安装 Python 依赖
echo ""
echo "▸ [2/4] 检查 Python 依赖..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
pip install -q pyinstaller
cd ..
echo "  ✓ Python 依赖就绪"

# ③ PyInstaller 打包
echo ""
echo "▸ [3/4] PyInstaller 打包..."
cd backend
source venv/bin/activate
pyinstaller \
    --noconfirm \
    --onefile \
    --name "套餐推荐系统" \
    --add-data "$SCRIPT_DIR/frontend/dist:frontend_dist" \
    --add-data "$SCRIPT_DIR/backend/app:backend/app" \
    --collect-all fastapi \
    --collect-all uvicorn \
    --collect-all sqlalchemy \
    --collect-all pydantic \
    --collect-all httpx \
    --collect-all openpyxl \
    --hidden-import multipart \
    --hidden-import multipart.multipart \
    --hidden-import email.mime.text \
    --hidden-import uvloop \
    --exclude-module tkinter \
    --exclude-module matplotlib \
    --exclude-module numpy \
    --exclude-module pandas \
    --console \
    "$SCRIPT_DIR/run.py"
cd ..
echo "  ✓ 打包完成"

# ④ 输出
OUTPUT="backend/dist/套餐推荐系统"
echo ""
echo "▸ [4/4] 构建完成！"
echo ""
echo "══════════════════════════════════════════"
echo "  输出文件: $OUTPUT"
echo "  文件大小: $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "  使用方法:"
echo "    1. 将 '$OUTPUT' 拷贝到目标机器"
echo "    2. 双击运行"
echo "    3. 浏览器自动打开 http://localhost:8000"
echo "══════════════════════════════════════════"
