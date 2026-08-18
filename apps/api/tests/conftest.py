import asyncio
import os
import uuid

os.environ["DATABASE_URL"] = "postgresql+asyncpg://joblane:joblane@localhost:5433/joblane_test"
os.environ["REDIS_URL"] = "redis://localhost:6380/1"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.core.database import Base, engine
from main import app
from app.auth.models import User, UserStatus
from app.admin.models import Job, Company, JobCategory, Region, JobStatus, AuditLog

ADMIN_EMAIL = "admin@joblane.az"
MODERATOR_EMAIL = "moderator@joblane.az"
PASSWORD = "TestSeedPass!23456"


@pytest_asyncio.fixture(autouse=True)
async def _reset_rate_limits():
    from app.core.redis import get_redis

    client = await get_redis()
    await client.flushdb()
    yield
    await client.flushdb()


@pytest_asyncio.fixture(scope="session")
async def db_ready():
    from app.core.database import AsyncSessionLocal

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from app.auth.security import get_password_hash

        hashed = get_password_hash(PASSWORD)
        users = [
            User(email=ADMIN_EMAIL, email_normalized=ADMIN_EMAIL.lower(), password_hash=hashed, role="SUPER_ADMIN", full_name="Test Admin", email_verified_at=datetime.now(timezone.utc), status=UserStatus.ACTIVE),
            User(email=MODERATOR_EMAIL, email_normalized=MODERATOR_EMAIL.lower(), password_hash=hashed, role="MODERATOR", full_name="Test Moderator", email_verified_at=datetime.now(timezone.utc), status=UserStatus.ACTIVE),
            User(email="candidate@joblane.az", email_normalized="candidate@joblane.az", password_hash=hashed, role="USER", full_name="Test User", email_verified_at=datetime.now(timezone.utc), status=UserStatus.ACTIVE),
        ]
        db.add_all(users)
        category = JobCategory(name="IT", slug="it", sort_order=1, is_active=True)
        region = Region(name="Bakı", slug="baki", country="AZ", city="Bakı", sort_order=1, is_active=True)
        company = Company(
            name="Test Corp",
            slug="test-corp",
            status="VERIFIED",
            industry="IT",
            website="https://test.az",
        )
        db.add_all([category, region, company])
        await db.flush()
        for i in range(6):
            db.add(
                Job(
                    company_id=company.id,
                    category_id=category.id,
                    region_id=region.id,
                    title=f"Pending Job {i}",
                    slug=f"pending-job-{i}",
                    description="desc",
                    status=JobStatus.PENDING_REVIEW,
                    location="Bakı",
                    salary_min=1000,
                    salary_max=2000,
                    salary_currency="AZN",
                    salary_visible=True,
                    employment_type="FULL_TIME",
                    work_mode="ON_SITE",
                    experience_level="MID",
                    is_premium=False,
                    is_featured=False,
                    is_urgent=False,
                    views=0,
                    applications_count=0,
                    favorites_count=0,
                )
            )
        from app.admin.models import JobModerationHistory
        approved = Job(
            company_id=company.id,
            category_id=category.id,
            region_id=region.id,
            title="Approved Job",
            slug="approved-job",
            description="desc",
            status=JobStatus.APPROVED,
            location="Bakı",
            employment_type="FULL_TIME",
            work_mode="ON_SITE",
            is_premium=False,
            is_featured=False,
            is_urgent=False,
            views=0,
            applications_count=0,
            favorites_count=0,
        )
        db.add(approved)
        await db.flush()
        db.add(
            JobModerationHistory(
                job_id=approved.id,
                from_status=JobStatus.PENDING_REVIEW.value,
                to_status=JobStatus.APPROVED.value,
                actor_email=ADMIN_EMAIL,
            )
        )
        await db.commit()
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_ready):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def login(client: AsyncClient, email: str) -> str:
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 200, res.text
    token = client.cookies.get("csrf_token")
    assert token, "csrf cookie not set"
    return token


async def csrf_headers(token: str) -> dict:
    return {"X-CSRF-Token": token, "Content-Type": "application/json"}
