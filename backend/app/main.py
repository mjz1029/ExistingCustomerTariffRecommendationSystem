from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def root():
    return {"message": "存量用户套餐推荐系统 API", "docs": "/docs"}
