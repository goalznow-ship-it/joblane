from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, dispose_db
from app.auth.router import router as auth_router, account_router
from app.admin.router import router as admin_router
from app.employer.router import router as employer_router
from app.candidate.router import router as candidate_router
from app.public.router import router as public_router
from app.health import router as health_router

app = FastAPI(title=settings.app_name, debug=settings.app_debug)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await init_db()


@app.on_event("shutdown")
async def shutdown_event():
    await dispose_db()


app.include_router(auth_router)
app.include_router(account_router)
app.include_router(admin_router)
app.include_router(employer_router)
app.include_router(candidate_router)
app.include_router(public_router)
app.include_router(health_router)