import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import Base, engine, SessionLocal
from .routers import plans, users, recommendations, ai
from .seed import seed_plans

Base.metadata.create_all(bind=engine)

# Seed default plans on startup
db = SessionLocal()
try:
    seed_plans(db)
finally:
    db.close()

app = FastAPI(title="存量用户套餐推荐系统 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plans.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")

# ── 前端静态文件服务（打包模式或开发构建模式） ──
frontend_dir = os.environ.get("FRONTEND_DIR") or ""
if not frontend_dir:
    # 自动检测：项目根目录下的 frontend_dist 或 dist
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for candidate in ["frontend_dist", "dist"]:
        d = os.path.join(root_dir, candidate)
        if os.path.isdir(d) and os.path.exists(os.path.join(d, "index.html")):
            frontend_dir = d
            break

if frontend_dir and os.path.isdir(frontend_dir):
    # 挂载静态资源（JS/CSS/图片等）
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/vite.svg")
    def serve_svg():
        svg_path = os.path.join(frontend_dir, "vite.svg")
        if os.path.exists(svg_path):
            return FileResponse(svg_path)
        return {"error": "not found"}
else:
    @app.get("/")
    def root():
        return {"message": "存量用户套餐推荐系统 API", "docs": "/docs"}
