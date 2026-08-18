"""
Health check endpoints for Joblane API.
"""

from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import engine
from app.core.redis import get_redis

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("/live")
async def live() -> dict:
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> dict:
    checks = {"database": "ok", "redis": "ok"}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "error"
    try:
        redis_client = await get_redis()
        await redis_client.ping()
    except Exception:
        checks["redis"] = "error"
    return {"status": "ok" if all(v == "ok" for v in checks.values()) else "degraded", "checks": checks}
