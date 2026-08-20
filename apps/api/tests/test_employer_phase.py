"""
End-to-end tests for the employer portal (Phase 2).

Covers: onboarding (me/company creation), company profile management,
job CRUD + submit/pause/archive workflow, applications pipeline,
tenant isolation between companies, and admin-field protection.
"""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import Base, engine
from main import app
from app.auth.models import User, UserStatus
from app.auth.security import get_password_hash
from app.admin.models import (
    Application,
    ApplicationStatus,
    Company,
    CompanyMemberRole,
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyStatus,
    Job,
    JobStatus,
)

from tests.conftest import ADMIN_EMAIL, PASSWORD, login, csrf_headers

EMPLOYER_A_EMAIL = "employer.a@joblane.az"
EMPLOYER_B_EMAIL = "employer.b@joblane.az"
EMPLOYER_C_EMAIL = "employer.c@joblane.az"
CANDIDATE_EMAIL = "candidate2@joblane.az"

PASSWORD_HASH = None


async def _make_user(db, email: str, full_name: str) -> User:
    global PASSWORD_HASH
    if PASSWORD_HASH is None:
        PASSWORD_HASH = get_password_hash(PASSWORD)
    user = User(
        email=email,
        email_normalized=email.lower(),
        password_hash=PASSWORD_HASH,
        role="USER",
        full_name=full_name,
        email_verified_at=datetime.now(timezone.utc),
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture(scope="module")
async def employer_users(db_ready):
    """Seed employer A/B (with companies), employer C (no company) and a candidate."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        users = []
        for email, name in [
            (EMPLOYER_A_EMAIL, "Employer A"),
            (EMPLOYER_B_EMAIL, "Employer B"),
            (EMPLOYER_C_EMAIL, "Employer C"),
            (CANDIDATE_EMAIL, "Candidate Two"),
        ]:
            users.append(await _make_user(db, email, name))
        await db.flush()

        companies = []
        for name, slug, user_id in [
            ("Employer A Corp", "employer-a-corp", users[0].id),
            ("Employer B Corp", "employer-b-corp", users[1].id),
        ]:
            company = Company(
                name=name,
                slug=slug,
                description="Seeded test company",
                status=CompanyStatus.PENDING,
            )
            db.add(company)
            await db.flush()
            companies.append(company)
            db.add(
                CompanyMembership(
                    company_id=company.id,
                    user_id=user_id,
                    role=CompanyMemberRole.OWNER,
                    status=CompanyMembershipStatus.ACTIVE,
                )
            )
        await db.commit()
        user_ids = [u.id for u in users]
    yield
    async with AsyncSessionLocal() as db:
        from app.admin.models import (
            AuditLog,
            JobModerationHistory,
            CompanyModerationHistory,
        )
        company_rows = await db.execute(
            select(CompanyMembership.company_id).where(CompanyMembership.user_id.in_(user_ids))
        )
        company_ids = [row[0] for row in company_rows.all()]
        await db.execute(AuditLog.__table__.delete().where(AuditLog.actor_id.in_(user_ids)))
        await db.execute(JobModerationHistory.__table__.delete().where(JobModerationHistory.actor_id.in_(user_ids)))
        await db.execute(CompanyModerationHistory.__table__.delete().where(CompanyModerationHistory.actor_id.in_(user_ids)))
        await db.execute(CompanyMembership.__table__.delete().where(CompanyMembership.user_id.in_(user_ids)))
        await db.execute(Company.__table__.delete().where(Company.id.in_(company_ids)))
        await db.execute(User.__table__.delete().where(User.id.in_(user_ids)))
        await db.commit()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_ready):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _company_id_of(db, user_id) -> uuid.UUID:
    result = await db.execute(
        select(CompanyMembership.company_id).where(CompanyMembership.user_id == user_id)
    )
    return result.scalar_one()


# ---------- Onboarding ----------

async def test_me_without_company(client, employer_users):
    token = await login(client, EMPLOYER_C_EMAIL)
    res = await client.get("/api/v1/employer/me", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["email"] == EMPLOYER_C_EMAIL
    assert data["memberships"] == []
    assert data["current_company"] is None


async def test_company_access_requires_company(client, employer_users):
    token = await login(client, EMPLOYER_C_EMAIL)
    res = await client.get("/api/v1/employer/company", headers={"X-CSRF-Token": token})
    assert res.status_code == 403
    assert "Şirkət" in res.json()["detail"]


async def test_me_with_company(client, employer_users):
    token = await login(client, EMPLOYER_A_EMAIL)
    res = await client.get("/api/v1/employer/me", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["email"] == EMPLOYER_A_EMAIL
    assert len(data["memberships"]) == 1
    assert data["memberships"][0]["role"] == "OWNER"
    assert data["current_company"]["name"] == "Employer A Corp"


async def test_create_company_sets_owner(client, employer_users):
    token = await login(client, EMPLOYER_C_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/company",
        json={"name": "Employer C Corp", "description": "Test company", "email": "c@ccorp.az"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "PENDING"
    assert data["slug"] == "employer-c-corp"
    assert data["email"] == "c@ccorp.az"

    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == EMPLOYER_C_EMAIL))).scalar_one()
        result = await db.execute(
            select(CompanyMembership).where(
                CompanyMembership.company_id == data["id"],
                CompanyMembership.user_id == user.id,
            )
        )
        membership = result.scalar_one()
        assert membership.role == CompanyMemberRole.OWNER
        assert membership.status == CompanyMembershipStatus.ACTIVE
        company = await db.get(Company, data["id"])
        assert company.status == CompanyStatus.PENDING


async def test_second_company_blocked(client, employer_users):
    token = await login(client, EMPLOYER_C_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/company",
        json={"name": "Another Corp"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "aktiv şirkət" in res.json()["detail"]


# ---------- Company profile ----------

async def test_update_company_and_get(client, employer_users):
    token = await login(client, EMPLOYER_A_EMAIL)
    headers = await csrf_headers(token)

    res = await client.patch(
        "/api/v1/employer/company",
        json={"description": "Updated description", "phone": "+994501234567"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["description"] == "Updated description"

    res = await client.get("/api/v1/employer/company", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    assert res.json()["phone"] == "+994501234567"


async def test_update_company_forbidden_fields(client, employer_users):
    token = await login(client, EMPLOYER_A_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        "/api/v1/employer/company",
        json={"status": "VERIFIED", "featured_until": "2030-01-01T00:00:00Z"},
        headers=headers,
    )
    assert res.status_code == 422  # extra fields rejected


# ---------- Jobs ----------

async def test_job_crud_workflow(client, employer_users):
    token = await login(client, EMPLOYER_A_EMAIL)
    headers = await csrf_headers(token)

    # Create job -> DRAFT
    res = await client.post(
        "/api/v1/employer/jobs",
        json={
            "title": "Frontend Developer",
            "description": "Build the future",
            "employment_type": "FULL_TIME",
            "work_mode": "REMOTE",
            "salary_min": 2000,
            "salary_max": 4000,
            "location": "Bakı",
            "experience_level": "MID",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    job = res.json()
    assert job["status"] == "DRAFT"
    assert job["slug"] == "frontend-developer-employer-a-corp"
    job_id = job["id"]

    # PATCH while DRAFT works
    res = await client.patch(
        f"/api/v1/employer/jobs/{job_id}",
        json={"salary_min": 2500},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["salary_min"] == 2500.0

    # Admin-only field smuggling rejected
    res = await client.patch(
        f"/api/v1/employer/jobs/{job_id}",
        json={"is_premium": True, "status": "PUBLISHED", "publication_date": "2030-01-01T00:00:00Z"},
        headers=headers,
    )
    assert res.status_code == 422

    # Submit -> PENDING_REVIEW
    res = await client.post(
        f"/api/v1/employer/jobs/{job_id}/status",
        json={"action": "submit"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "PENDING_REVIEW"

    # Editing while PENDING_REVIEW blocked
    res = await client.patch(
        f"/api/v1/employer/jobs/{job_id}",
        json={"title": "Senior Frontend Developer"},
        headers=headers,
    )
    assert res.status_code == 400

    # Pause -> PAUSED
    res = await client.post(
        f"/api/v1/employer/jobs/{job_id}/status",
        json={"action": "pause"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "PAUSED"

    # Archive -> ARCHIVED
    res = await client.post(
        f"/api/v1/employer/jobs/{job_id}/status",
        json={"action": "archive"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ARCHIVED"

    # Archive twice blocked
    res = await client.post(
        f"/api/v1/employer/jobs/{job_id}/status",
        json={"action": "archive"},
        headers=headers,
    )
    assert res.status_code == 400

    # List with filters
    res = await client.get("/api/v1/employer/jobs?status=ARCHIVED", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    assert res.json()["total"] >= 1


# ---------- Applications ----------

async def test_applications_pipeline(client, employer_users):
    token = await login(client, EMPLOYER_A_EMAIL)
    headers = await csrf_headers(token)

    from app.core.database import AsyncSessionLocal

    # Create a second job and an application from the candidate
    async with AsyncSessionLocal() as db:
        user_a = (await db.execute(select(User).where(User.email == EMPLOYER_A_EMAIL))).scalar_one()
        company_id = await _company_id_of(db, user_a.id)
        job = Job(
            company_id=company_id,
            title="Backend Engineer",
            slug=f"backend-engineer-{uuid.uuid4().hex[:8]}",
            description="desc",
            status=JobStatus.PUBLISHED,
            employment_type="FULL_TIME",
            work_mode="HYBRID",
            is_premium=False,
            is_featured=False,
            is_urgent=False,
            views=0,
            applications_count=1,
            favorites_count=0,
        )
        db.add(job)
        await db.flush()
        candidate = (await db.execute(select(User).where(User.email == CANDIDATE_EMAIL))).scalar_one()
        app_row = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            status=ApplicationStatus.SUBMITTED,
            cover_letter="I would love to join!",
        )
        db.add(app_row)
        await db.commit()
        job_id, application_id = job.id, app_row.id

    # List applications scoped to employer A
    res = await client.get("/api/v1/employer/applications", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    found = next((a for a in data["items"] if a["id"] == str(application_id)), None)
    assert found is not None
    assert found["candidate_name"] == "Candidate Two"
    assert found["candidate_email"] == CANDIDATE_EMAIL
    assert found["job_title"] == "Backend Engineer"
    assert found["status"] == "SUBMITTED"

    # Filter by job
    res = await client.get(
        f"/api/v1/employer/applications?job_id={job_id}&status=SUBMITTED",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200
    assert res.json()["total"] == 1

    # Invalid transition: SUBMITTED -> HIRED
    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        json={"status": "HIRED"},
        headers=headers,
    )
    assert res.status_code == 409

    # Valid: SUBMITTED -> SHORTLISTED -> INTERVIEW -> HIRED
    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        json={"status": "SHORTLISTED"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SHORTLISTED"

    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        json={"status": "INTERVIEW"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "INTERVIEW"

    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        json={"status": "HIRED"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "HIRED"

    # Terminal: HIRED -> REJECTED blocked
    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        json={"status": "REJECTED"},
        headers=headers,
    )
    assert res.status_code == 409

    # WITHDRAWN is candidate-only: employer cannot set it
    async with AsyncSessionLocal() as db:
        from app.admin.models import Application as AppModel
        app_obj = await db.get(AppModel, application_id)
        app_obj.status = ApplicationStatus.SUBMITTED
        await db.commit()
    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        json={"status": "WITHDRAWN"},
        headers=headers,
    )
    assert res.status_code == 409


# ---------- Tenant isolation ----------

async def test_tenant_isolation(client, employer_users):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client_a, AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client_b:
        token_a = await login(client_a, EMPLOYER_A_EMAIL)
        headers_a = await csrf_headers(token_a)

        token_b = await login(client_b, EMPLOYER_B_EMAIL)
        headers_b = await csrf_headers(token_b)

        # B sees only B's company
        res = await client_b.get("/api/v1/employer/company", headers={"X-CSRF-Token": token_b})
        assert res.status_code == 200
        company_b_id = res.json()["id"]
        assert res.json()["name"] == "Employer B Corp"

        # A cannot see B's company
        res = await client_a.get("/api/v1/employer/company", headers={"X-CSRF-Token": token_a})
        assert res.status_code == 200
        assert res.json()["id"] != company_b_id

        # B creates a job; A cannot see it
        res = await client_b.post(
            "/api/v1/employer/jobs",
            json={"title": "B Secret Job", "employment_type": "CONTRACT"},
            headers=headers_b,
        )
        assert res.status_code == 201
        secret_job_id = res.json()["id"]

        res = await client_a.get(f"/api/v1/employer/jobs/{secret_job_id}", headers={"X-CSRF-Token": token_a})
        assert res.status_code == 404

        # A cannot mutate B's job
        res = await client_a.post(
            f"/api/v1/employer/jobs/{secret_job_id}/status",
            json={"action": "archive"},
            headers=headers_a,
        )
        assert res.status_code == 404

        # A cannot list B's jobs
        res = await client_a.get("/api/v1/employer/jobs", headers={"X-CSRF-Token": token_a})
        assert res.status_code == 200
        assert all(j["company_id"] != company_b_id for j in res.json()["items"])

        # B cannot change the company id in their job payload
        res = await client_b.patch(
            f"/api/v1/employer/jobs/{secret_job_id}",
            json={"company_id": str(company_b_id)},
            headers=headers_b,
        )
        assert res.status_code == 422  # extra field rejected


# ---------- Dashboard ----------

async def test_dashboard(client, employer_users):
    token = await login(client, EMPLOYER_A_EMAIL)
    res = await client.get("/api/v1/employer/dashboard", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["company"]["name"] == "Employer A Corp"
    assert data["jobs_total"] >= 2
    assert data["applications_total"] >= 1
    assert isinstance(data["total_views"], int)
    assert len(data["recent_applications"]) >= 1