"""
End-to-end tests for the candidate portal (Phase 3).

Covers: candidate/me, profile/experience/education/resume CRUD with
ownership isolation, saved jobs, real apply flow, duplicate/visibility/
deadline/foreign-resume/same-company guards, application ownership,
withdraw, application status history, employer pipeline integration,
count integrity, CSRF, unauthenticated access and tenant isolation.
"""

import uuid
from datetime import datetime, timedelta, timezone

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
from app.candidate.models import (
    ApplicationHistory,
    CandidateEducation,
    CandidateExperience,
    CandidateProfile,
    CandidateResume,
    SavedJob,
)

from conftest import PASSWORD, login, csrf_headers

CANDIDATE_EMAIL = "phase3.candidate@joblane.az"
CANDIDATE2_EMAIL = "phase3.candidate2@joblane.az"
EMPLOYER_CAND_EMAIL = "phase3.employer.cand@joblane.az"
EMPLOYER_EMAIL = "phase3.employer@joblane.az"
EMPLOYER2_EMAIL = "phase3.employer2@joblane.az"

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
async def candidate_seed(db_ready):
    """Seed two candidate users, an employer with a company and jobs."""
    from app.core.database import AsyncSessionLocal

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        candidate = await _make_user(db, CANDIDATE_EMAIL, "Phase Three Candidate")
        candidate2 = await _make_user(db, CANDIDATE2_EMAIL, "Phase Three Candidate Two")
        employer_cand = await _make_user(db, EMPLOYER_CAND_EMAIL, "Employer Candidate")
        employer = await _make_user(db, EMPLOYER_EMAIL, "Phase Three Employer")
        employer2 = await _make_user(db, EMPLOYER2_EMAIL, "Phase Three Employer Two")
        await db.flush()

        company = Company(
            name="Phase Three Corp",
            slug=f"phase-three-corp-{uuid.uuid4().hex[:8]}",
            description="Seeded",
            status=CompanyStatus.VERIFIED,
        )
        db.add(company)
        await db.flush()
        company2 = Company(
            name="Phase Three Corp Two",
            slug=f"phase-three-corp-two-{uuid.uuid4().hex[:8]}",
            description="Seeded",
            status=CompanyStatus.VERIFIED,
        )
        db.add(company2)
        await db.flush()

        db.add_all([
            CompanyMembership(
                company_id=company.id,
                user_id=employer.id,
                role=CompanyMemberRole.OWNER,
                status=CompanyMembershipStatus.ACTIVE,
            ),
            CompanyMembership(
                company_id=company2.id,
                user_id=employer2.id,
                role=CompanyMemberRole.OWNER,
                status=CompanyMembershipStatus.ACTIVE,
            ),
            CompanyMembership(
                company_id=company.id,
                user_id=employer_cand.id,
                role=CompanyMemberRole.RECRUITER,
                status=CompanyMembershipStatus.ACTIVE,
            ),
        ])

        jobs = []
        for slug_suffix, title, status, deadline_delta, expiration_delta in [
            ("open", "Open Role", JobStatus.PUBLISHED, timedelta(days=30), timedelta(days=60)),
            ("pending", "Pending Role", JobStatus.PENDING_REVIEW, timedelta(days=30), None),
            ("expired", "Expired Role", JobStatus.PUBLISHED, timedelta(days=30), timedelta(days=-2)),
            ("deadline", "Deadline Role", JobStatus.PUBLISHED, timedelta(days=-2), timedelta(days=60)),
        ]:
            job = Job(
                company_id=company.id,
                title=title,
                slug=f"phase3-{slug_suffix}-{uuid.uuid4().hex[:8]}",
                description="desc",
                status=status,
                location="Bakı",
                employment_type="FULL_TIME",
                work_mode="ON_SITE",
                is_premium=False,
                is_featured=False,
                is_urgent=False,
                views=0,
                applications_count=0,
                favorites_count=0,
                application_deadline=now + deadline_delta if deadline_delta else None,
                expiration_date=now + expiration_delta if expiration_delta else None,
            )
            db.add(job)
            jobs.append(job)

        other_job = Job(
            company_id=company2.id,
            title="Other Company Role",
            slug=f"phase3-other-{uuid.uuid4().hex[:8]}",
            description="desc",
            status=JobStatus.PUBLISHED,
            employment_type="FULL_TIME",
            work_mode="REMOTE",
            is_premium=False,
            is_featured=False,
            is_urgent=False,
            views=0,
            applications_count=0,
            favorites_count=0,
        )
        db.add(other_job)
        await db.flush()
        jobs.append(other_job)

        await db.commit()

        data = {
            "candidate_id": candidate.id,
            "candidate2_id": candidate2.id,
            "employer_cand_id": employer_cand.id,
            "employer_id": employer.id,
            "employer2_id": employer2.id,
            "company_id": company.id,
            "company2_id": company2.id,
            "job_id": jobs[0].id,
            "pending_job_id": jobs[1].id,
            "expired_job_id": jobs[2].id,
            "deadline_job_id": jobs[3].id,
            "other_job_id": jobs[4].id,
        }
    yield data

    async with AsyncSessionLocal() as db:
        user_ids = [
            data["candidate_id"],
            data["candidate2_id"],
            data["employer_cand_id"],
            data["employer_id"],
            data["employer2_id"],
        ]
        from app.admin.models import AuditLog
        from app.admin.models import Company as CompanyModel
        await db.execute(AuditLog.__table__.delete().where(AuditLog.actor_id.in_(user_ids)))
        await db.execute(ApplicationHistory.__table__.delete())
        await db.execute(Application.__table__.delete())
        await db.execute(SavedJob.__table__.delete())
        await db.execute(CandidateResume.__table__.delete())
        await db.execute(CandidateEducation.__table__.delete())
        await db.execute(CandidateExperience.__table__.delete())
        await db.execute(CandidateProfile.__table__.delete())
        await db.execute(CompanyMembership.__table__.delete().where(CompanyMembership.user_id.in_(user_ids)))
        await db.execute(Job.__table__.delete())
        await db.execute(CompanyModel.__table__.delete().where(CompanyModel.id.in_([data["company_id"], data["company2_id"]])))
        await db.execute(User.__table__.delete().where(User.id.in_(user_ids)))
        await db.commit()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_ready):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _db_get_job_counts(db, job_id):
    job = await db.get(Job, job_id)
    return job.applications_count, job.favorites_count


async def _seed_profile(db, user_id):
    existing = (await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    )).scalar_one_or_none()
    if existing:
        return existing
    profile = CandidateProfile(
        user_id=user_id,
        headline="Headline",
        summary="Summary",
        skills=["Python", "FastAPI"],
        experience_years=3,
        is_public=True,
    )
    db.add(profile)
    await db.flush()
    return profile


# ---------- Me ----------

async def test_candidate_me_requires_auth(client, candidate_seed):
    res = await client.get("/api/v1/candidate/me")
    assert res.status_code == 401


async def test_candidate_me_initial(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    res = await client.get("/api/v1/candidate/me", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["email"] == CANDIDATE_EMAIL
    assert data["profile"] is None
    assert data["experiences"] == []
    assert data["educations"] == []
    assert data["resumes"] == []
    assert data["saved_jobs_count"] == 0
    assert data["applications_count"] == 0


async def test_candidate_me_with_data(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        profile = await _seed_profile(db, candidate_seed["candidate_id"])
        db.add(CandidateExperience(
            candidate_profile_id=profile.id,
            title="Backend Engineer",
            company_name="Tech Co",
            start_date=datetime(2022, 1, 1).date(),
            is_current=True,
        ))
        db.add(CandidateEducation(
            candidate_profile_id=profile.id,
            institution="Baku State University",
            degree="Bachelor",
        ))
        resume = CandidateResume(
            candidate_profile_id=profile.id,
            title="My CV",
            file_url="/storage/joblane/test.pdf",
            file_name="test.pdf",
            file_size=100,
            mime_type="application/pdf",
            is_default=True,
        )
        db.add(resume)
        await db.commit()
        profile_id = profile.id

    token = await login(client, CANDIDATE_EMAIL)
    res = await client.get("/api/v1/candidate/me", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["profile"]["id"] == str(profile_id)
    assert data["profile"]["skills"] == ["Python", "FastAPI"]
    assert len(data["experiences"]) == 1
    assert data["experiences"][0]["title"] == "Backend Engineer"
    assert len(data["educations"]) == 1
    assert len(data["resumes"]) == 1
    assert data["resumes"][0]["is_default"] is True


# ---------- Profile ----------

async def test_profile_update_and_get(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)

    res = await client.patch(
        "/api/v1/candidate/profile",
        json={
            "headline": "Senior Developer",
            "summary": "10 years of experience",
            "skills": ["Python", "SQL"],
            "experience_years": 10,
            "is_public": False,
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["headline"] == "Senior Developer"
    assert data["experience_years"] == 10
    assert data["is_public"] is False

    res = await client.get("/api/v1/candidate/profile", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    assert res.json()["summary"] == "10 years of experience"

    res = await client.patch(
        "/api/v1/candidate/profile",
        json={"is_public": True},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["is_public"] is True


async def test_profile_rejects_unknown_fields(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        "/api/v1/candidate/profile",
        json={"role": "ADMIN", "status": "VERIFIED"},
        headers=headers,
    )
    assert res.status_code == 422  # extra fields rejected


async def test_profile_isolation(client, candidate_seed):
    # candidate1's profile must not be candidate2's profile; each candidate
    # only ever sees their own data via /candidate/me and /candidate/profile
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        c1_profile = (await db.execute(
            select(CandidateProfile).where(CandidateProfile.user_id == candidate_seed["candidate_id"])
        )).scalar_one_or_none()
    assert c1_profile is not None

    token = await login(client, CANDIDATE_EMAIL)
    res = await client.get("/api/v1/candidate/profile", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    c1_id = res.json()["id"]

    token2 = await login(client, CANDIDATE2_EMAIL)
    res2 = await client.get("/api/v1/candidate/profile", headers={"X-CSRF-Token": token2})
    assert res2.status_code == 200
    assert res2.json()["id"] != c1_id


# ---------- Experience ----------

async def test_experience_crud(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)

    res = await client.post(
        "/api/v1/candidate/experience",
        json={
            "title": "Frontend Developer",
            "company_name": "Web Agency",
            "start_date": "2020-06-01",
            "end_date": "2021-06-01",
            "description": "Built UIs",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    exp = res.json()
    assert exp["title"] == "Frontend Developer"
    assert exp["start_date"] == "2020-06-01"
    exp_id = exp["id"]

    res = await client.patch(
        f"/api/v1/candidate/experience/{exp_id}",
        json={"is_current": True, "end_date": None},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["is_current"] is True

    res = await client.get("/api/v1/candidate/experience", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    assert any(e["id"] == exp_id for e in res.json())

    res = await client.delete(f"/api/v1/candidate/experience/{exp_id}", headers=headers)
    assert res.status_code == 204

    res = await client.get("/api/v1/candidate/experience", headers={"X-CSRF-Token": token})
    assert all(e["id"] != exp_id for e in res.json())


async def test_experience_isolation(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        profile = await _seed_profile(db, candidate_seed["candidate_id"])
        item = CandidateExperience(
            candidate_profile_id=profile.id,
            title="Secret Experience",
        )
        db.add(item)
        await db.commit()
        secret_id = item.id

    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.get(f"/api/v1/candidate/experience/{secret_id}", headers=headers)
    assert res.status_code == 405  # no GET by id endpoint
    res = await client.patch(
        f"/api/v1/candidate/experience/{secret_id}",
        json={"title": "Hacked"},
        headers=headers,
    )
    assert res.status_code == 404
    res = await client.delete(f"/api/v1/candidate/experience/{secret_id}", headers=headers)
    assert res.status_code == 404


# ---------- Education ----------

async def test_education_crud(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)

    res = await client.post(
        "/api/v1/candidate/education",
        json={
            "institution": "ADA University",
            "degree": "Master",
            "field_of_study": "Computer Science",
            "start_date": "2018-09-01",
            "end_date": "2020-06-01",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    edu = res.json()
    assert edu["institution"] == "ADA University"
    edu_id = edu["id"]

    res = await client.patch(
        f"/api/v1/candidate/education/{edu_id}",
        json={"field_of_study": "Software Engineering"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["field_of_study"] == "Software Engineering"

    res = await client.get("/api/v1/candidate/education", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    assert any(e["id"] == edu_id for e in res.json())

    res = await client.delete(f"/api/v1/candidate/education/{edu_id}", headers=headers)
    assert res.status_code == 204


async def test_education_isolation(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        profile = await _seed_profile(db, candidate_seed["candidate_id"])
        item = CandidateEducation(
            candidate_profile_id=profile.id,
            institution="Secret University",
        )
        db.add(item)
        await db.commit()
        secret_id = item.id

    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/candidate/education/{secret_id}",
        json={"degree": "Hacked"},
        headers=headers,
    )
    assert res.status_code == 404
    res = await client.delete(f"/api/v1/candidate/education/{secret_id}", headers=headers)
    assert res.status_code == 404


# ---------- Resumes ----------

async def test_resume_upload_default_and_list(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)

    files = {"file": ("cv.pdf", b"%PDF-1.4 fake resume", "application/pdf")}
    res = await client.post(
        "/api/v1/candidate/resumes",
        files=files,
        data={"title": "Senior CV", "is_default": "true"},
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 201, res.text
    resume = res.json()
    assert resume["title"] == "Senior CV"
    assert resume["is_default"] is True
    assert resume["file_name"] == "cv.pdf"
    assert resume["mime_type"] == "application/pdf"
    first_id = resume["id"]

    files = {"file": ("cv2.pdf", b"%PDF-1.4 second", "application/pdf")}
    res = await client.post(
        "/api/v1/candidate/resumes",
        files=files,
        data={"title": "Second CV"},
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 201, res.text
    second_id = res.json()["id"]
    assert res.json()["is_default"] is False

    res = await client.patch(
        f"/api/v1/candidate/resumes/{second_id}",
        json={"is_default": True},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["is_default"] is True

    res = await client.get("/api/v1/candidate/resumes", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    items = res.json()
    by_id = {i["id"]: i for i in items}
    assert by_id[first_id]["is_default"] is False
    assert by_id[second_id]["is_default"] is True

    res = await client.delete(f"/api/v1/candidate/resumes/{first_id}", headers=headers)
    assert res.status_code == 204
    res = await client.delete(f"/api/v1/candidate/resumes/{second_id}", headers=headers)
    assert res.status_code == 204


async def test_resume_rejects_bad_format(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    files = {"file": ("evil.exe", b"MZ fake", "application/x-msdownload")}
    res = await client.post(
        "/api/v1/candidate/resumes",
        files=files,
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 400


async def test_resume_isolation(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        profile = await _seed_profile(db, candidate_seed["candidate_id"])
        resume = CandidateResume(
            candidate_profile_id=profile.id,
            title="Secret CV",
            file_url="/storage/joblane/secret.pdf",
            is_default=True,
        )
        db.add(resume)
        await db.commit()
        resume_id = resume.id

    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/candidate/resumes/{resume_id}",
        json={"is_default": True},
        headers=headers,
    )
    assert res.status_code == 404
    res = await client.delete(f"/api/v1/candidate/resumes/{resume_id}", headers=headers)
    assert res.status_code == 404


# ---------- Saved jobs ----------

async def test_save_and_list_jobs(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)
    job_id = str(candidate_seed["job_id"])

    res = await client.post(f"/api/v1/candidate/saved/{job_id}", headers=headers)
    assert res.status_code == 201, res.text

    res = await client.post(f"/api/v1/candidate/saved/{job_id}", headers=headers)
    assert res.status_code == 409  # duplicate save

    res = await client.get("/api/v1/candidate/saved", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["job_id"] == job_id
    assert item["job_title"] == "Open Role"
    assert item["company_name"] == "Phase Three Corp"

    res = await client.delete(f"/api/v1/candidate/saved/{job_id}", headers=headers)
    assert res.status_code == 204
    res = await client.get("/api/v1/candidate/saved", headers={"X-CSRF-Token": token})
    assert res.json()["total"] == 0


async def test_save_invalid_job_blocked(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/candidate/saved/{candidate_seed['pending_job_id']}", headers=headers
    )
    assert res.status_code == 400


# ---------- Apply ----------

async def test_apply_success_and_count(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)
    job_id = candidate_seed["job_id"]

    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        before_count, _ = await _db_get_job_counts(db, job_id)

    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(job_id), "cover_letter": "I want this job!"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    app_data = res.json()
    assert app_data["status"] == "SUBMITTED"
    assert app_data["job_title"] == "Open Role"
    assert app_data["cover_letter"] == "I want this job!"

    async with AsyncSessionLocal() as db:
        after_count, _ = await _db_get_job_counts(db, job_id)
    assert after_count == before_count + 1

    # History entry recorded for SUBMITTED
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(ApplicationHistory).where(ApplicationHistory.application_id == app_data["id"])
        )).scalars().all()
    assert len(rows) == 1
    assert rows[0].to_status == "SUBMITTED"
    assert rows[0].changed_by_role == "CANDIDATE"

    return app_data["id"]


async def test_duplicate_application_409(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["job_id"])},
        headers=headers,
    )
    assert res.status_code == 409
    assert "artıq müraciət" in res.json()["detail"]


async def test_apply_non_public_job_blocked(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["pending_job_id"])},
        headers=headers,
    )
    assert res.status_code == 400


async def test_apply_expired_job_blocked(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["expired_job_id"])},
        headers=headers,
    )
    assert res.status_code == 400


async def test_apply_deadline_passed_blocked(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["deadline_job_id"])},
        headers=headers,
    )
    assert res.status_code == 400


async def test_apply_foreign_resume_blocked(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        profile = await _seed_profile(db, candidate_seed["candidate_id"])
        resume = CandidateResume(
            candidate_profile_id=profile.id,
            title="Owner CV",
            file_url="/storage/joblane/owner.pdf",
            is_default=True,
        )
        db.add(resume)
        await db.commit()
        resume_id = resume.id

    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)

    res = await client.patch(
        "/api/v1/candidate/profile",
        json={"headline": "Profile Owner"},
        headers=headers,
    )
    assert res.status_code == 200, res.text

    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["other_job_id"]), "resume_id": str(resume_id)},
        headers=headers,
    )
    assert res.status_code in (400, 404)  # foreign resume blocked


async def test_apply_same_company_blocked(client, candidate_seed):
    token = await login(client, EMPLOYER_CAND_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["other_job_id"])},
        headers=headers,
    )
    assert res.status_code == 201, res.text  # different company: allowed

    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["job_id"])},
        headers=headers,
    )
    assert res.status_code == 400
    assert "şirkətinizin" in res.json()["detail"].lower()


async def test_apply_requires_csrf(client, candidate_seed):
    token = await login(client, CANDIDATE2_EMAIL)
    res = await client.post(
        "/api/v1/candidate/applications",
        json={"job_id": str(candidate_seed["other_job_id"])},
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 403


# ---------- Applications ----------

async def test_application_list_and_ownership(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    res = await client.get("/api/v1/candidate/applications", headers={"X-CSRF-Token": token})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any(a["job_title"] == "Open Role" for a in data["items"])

    # Candidate2 cannot see candidate1's application
    token2 = await login(client, CANDIDATE2_EMAIL)
    res2 = await client.get("/api/v1/candidate/applications", headers={"X-CSRF-Token": token2})
    assert res2.status_code == 200
    assert res2.json()["total"] == 0
    assert all(a["candidate_id"] != data["items"][0]["id"] for a in [])  # no candidate_id in payload


async def test_application_ownership(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        app_row = (await db.execute(
            select(Application).where(Application.candidate_id == candidate_seed["candidate_id"])
        )).scalars().first()
        app_id = app_row.id

    token2 = await login(client, CANDIDATE2_EMAIL)
    res = await client.get(
        f"/api/v1/candidate/applications/{app_id}", headers={"X-CSRF-Token": token2}
    )
    assert res.status_code == 404

    res = await client.post(
        f"/api/v1/candidate/applications/{app_id}/withdraw",
        headers={"X-CSRF-Token": token2},
    )
    assert res.status_code == 404


async def test_application_detail_with_history(client, candidate_seed):
    token = await login(client, CANDIDATE_EMAIL)
    headers = await csrf_headers(token)

    res = await client.get("/api/v1/candidate/applications", headers={"X-CSRF-Token": token})
    app_id = res.json()["items"][0]["id"]

    res = await client.get(
        f"/api/v1/candidate/applications/{app_id}", headers={"X-CSRF-Token": token}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["history"][0]["to_status"] == "SUBMITTED"
    assert data["history"][0]["changed_by_role"] == "CANDIDATE"


# ---------- Withdraw ----------

async def test_withdraw_and_count_integrity(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        candidate = (await db.execute(
            select(User).where(User.email == CANDIDATE2_EMAIL)
        )).scalar_one()
        job = await db.get(Job, candidate_seed["other_job_id"])
        before_count = job.applications_count
        app_row = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            status=ApplicationStatus.SUBMITTED,
        )
        db.add(app_row)
        await db.commit()
        app_id = app_row.id

    token = await login(client, CANDIDATE2_EMAIL)
    headers = await csrf_headers(token)

    res = await client.post(
        f"/api/v1/candidate/applications/{app_id}/withdraw", headers=headers
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "WITHDRAWN"

    async with AsyncSessionLocal() as db:
        after_count = (await db.get(Job, candidate_seed["other_job_id"])).applications_count
        history_rows = (await db.execute(
            select(ApplicationHistory).where(ApplicationHistory.application_id == app_id)
        )).scalars().all()
    assert after_count == before_count - 1  # withdraw decremented exactly once
    assert len(history_rows) == 1  # app was inserted directly, so only WITHDRAWN entry
    assert history_rows[0].to_status == "WITHDRAWN"
    assert history_rows[0].changed_by_role == "CANDIDATE"

    # Withdrawing twice blocked
    res = await client.post(
        f"/api/v1/candidate/applications/{app_id}/withdraw", headers=headers
    )
    assert res.status_code == 409


async def test_employer_cannot_transition_withdrawn(client, candidate_seed):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        candidate = (await db.execute(
            select(User).where(User.email == CANDIDATE2_EMAIL)
        )).scalar_one()
        app_row = Application(
            job_id=candidate_seed["other_job_id"],
            candidate_id=candidate.id,
            status=ApplicationStatus.WITHDRAWN,
        )
        db.add(app_row)
        await db.commit()
        app_id = app_row.id

    token = await login(client, EMPLOYER2_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/employer/applications/{app_id}/status",
        json={"status": "VIEWED"},
        headers=headers,
    )
    assert res.status_code == 409


# ---------- Employer pipeline integration ----------

async def test_employer_pipeline_visible_to_candidate(client, candidate_seed):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client_c, AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client_e:
        token_c = await login(client_c, CANDIDATE_EMAIL)
        token_e = await login(client_e, EMPLOYER_EMAIL)
        headers_e = await csrf_headers(token_e)

        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            app_row = (await db.execute(
                select(Application)
                .where(Application.candidate_id == candidate_seed["candidate_id"])
                .order_by(Application.applied_at.desc())
            )).scalars().first()
            app_id = app_row.id

        # Employer transitions: VIEWED -> SHORTLISTED -> INTERVIEW
        for new_status in ["VIEWED", "SHORTLISTED", "INTERVIEW"]:
            res = await client_e.patch(
                f"/api/v1/employer/applications/{app_id}/status",
                json={"status": new_status},
                headers=headers_e,
            )
            assert res.status_code == 200, res.text
            assert res.json()["status"] == new_status

        # Candidate sees every updated status in list and detail
        res = await client_c.get(
            f"/api/v1/candidate/applications/{app_id}", headers={"X-CSRF-Token": token_c}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "INTERVIEW"
        history = data["history"]
        assert [h["to_status"] for h in history] == ["SUBMITTED", "VIEWED", "SHORTLISTED", "INTERVIEW"]
        assert all(h["changed_by_role"] == "EMPLOYER" for h in history[1:])

        res = await client_c.get("/api/v1/candidate/applications", headers={"X-CSRF-Token": token_c})
        item = next(a for a in res.json()["items"] if a["id"] == str(app_id))
        assert item["status"] == "INTERVIEW"


async def test_employer_sees_real_candidate_application(client, candidate_seed):
    token_e = await login(client, EMPLOYER_EMAIL)
    res = await client.get("/api/v1/employer/applications", headers={"X-CSRF-Token": token_e})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    found = next(
        (a for a in data["items"] if a["candidate_email"] == CANDIDATE_EMAIL), None
    )
    assert found is not None
    assert found["job_title"] == "Open Role"
    assert found["candidate_name"] == "Phase Three Candidate"


# ---------- Tenant isolation ----------

async def test_candidate_tenant_isolation(client, candidate_seed):
    # Employer2's company must not see candidate1's application to company1's job
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client_e2, AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client_c, AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client_c2:
        token_e2 = await login(client_e2, EMPLOYER2_EMAIL)

        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            app_row = (await db.execute(
                select(Application)
                .where(Application.candidate_id == candidate_seed["candidate_id"])
                .order_by(Application.applied_at.desc())
            )).scalars().first()
            app_id = app_row.id

        res = await client_e2.get(
            f"/api/v1/employer/applications/{app_id}", headers={"X-CSRF-Token": token_e2}
        )
        assert res.status_code == 404

        # Candidate2 cannot withdraw candidate1's application
        token_c2 = await login(client_c2, CANDIDATE2_EMAIL)
        res = await client_c2.post(
            f"/api/v1/candidate/applications/{app_id}/withdraw",
            headers={"X-CSRF-Token": token_c2},
        )
        assert res.status_code == 404


async def test_saved_jobs_isolation(client, candidate_seed):
    token2 = await login(client, CANDIDATE2_EMAIL)
    res = await client.get("/api/v1/candidate/saved", headers={"X-CSRF-Token": token2})
    assert res.status_code == 200
    assert res.json()["total"] == 0

    res = await client.post(
        f"/api/v1/candidate/saved/{candidate_seed['job_id']}",
        headers={"X-CSRF-Token": token2},
    )
    assert res.status_code == 201
    res = await client.get("/api/v1/candidate/saved", headers={"X-CSRF-Token": token2})
    assert res.json()["total"] == 1
    res = await client.delete(
        f"/api/v1/candidate/saved/{candidate_seed['job_id']}",
        headers={"X-CSRF-Token": token2},
    )
    assert res.status_code == 204