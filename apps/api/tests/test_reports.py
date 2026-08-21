"""
End-to-end tests for the Phase 6 report/moderation system.

Covers: report creation, my reports listing, admin queue management,
report detail, assignment, priority, duplicate marking, dismissal,
violation confirmation, resolution, job action integration,
blocklist management, report history, and CSRF protection.
"""

import uuid
import itertools
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import Base, engine, AsyncSessionLocal
from main import app
from app.auth.models import User, UserStatus
from app.auth.security import get_password_hash
from app.admin.models import (
    Company,
    CompanyMemberRole,
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyStatus,
    Job,
    JobCategory,
    Region,
    JobStatus,
    Report,
    ReportHistory,
    ReportStatus,
    ReportPriority,
    ReportTargetType,
    ReportReason,
    ModerationBlocklist,
    AuditLog,
    BlocklistType,
    BlocklistStatus,
)
from app.notifications.models import Notification, NotificationType
from conftest import ADMIN_EMAIL, PASSWORD, login, csrf_headers


OWNER_EMAIL = "report.owner@joblane.az"
REPORTER_EMAIL = "report.reporter@joblane.az"
RECRUITER_EMAIL = "report.recruiter@joblane.az"
SECOND_REPORTER_EMAIL = "report.second@joblane.az"


# ── Helpers ───────────────────────────────────────────────────────────


async def _get_published_job_id() -> str:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job).where(
                Job.slug.like("report-test-job-%"),
                Job.status == JobStatus.PUBLISHED,
            )
        )
        job = result.scalar_one_or_none()
        return str(job.id) if job else None


async def _get_test_corp_id() -> str:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Company).where(Company.slug == "test-corp")
        )
        company = result.scalar_one_or_none()
        return str(company.id) if company else None


async def _get_user_id(email: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.id).where(User.email == email))
        return result.scalar_one_or_none()


_ip_counter = itertools.count()


async def _create_report_via_api(
    client: AsyncClient,
    target_type: str,
    target_id: str,
    reason: str = "SPAM",
    description: str = "Test report",
    reporter_email: str = REPORTER_EMAIL,
):
    token = await login(client, reporter_email)
    headers = await csrf_headers(token)
    n = next(_ip_counter)
    async with AsyncClient(
        transport=ASGITransport(
            app=app, client=(f"10.0.{n // 250}.{n % 250 + 1}", 1234)
        ),
        base_url="http://test",
        cookies=dict(client.cookies),
    ) as scoped:
        return await scoped.post(
            "/api/v1/reports/",
            json={
                "target_type": target_type,
                "target_id": target_id,
                "reason": reason,
                "description": description,
            },
            headers=headers,
        )


async def _create_job_in_db(
    title: str,
    status: JobStatus = JobStatus.PUBLISHED,
) -> str:
    async with AsyncSessionLocal() as db:
        company_result = await db.execute(
            select(Company).where(Company.slug == "test-corp")
        )
        company = company_result.scalar_one()

        cat_result = await db.execute(
            select(JobCategory).where(JobCategory.slug == "it")
        )
        category = cat_result.scalar_one()

        region_result = await db.execute(
            select(Region).where(Region.slug == "baki")
        )
        region = region_result.scalar_one()

        slug = f"{title.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"
        job = Job(
            company_id=company.id,
            category_id=category.id,
            region_id=region.id,
            title=title,
            slug=slug,
            description="Test job",
            status=status,
            location="Baki",
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
        db.add(job)
        await db.commit()
        return str(job.id)


# ── Module-scoped fixture ─────────────────────────────────────────────


@pytest_asyncio.fixture(scope="module")
async def report_users(db_ready):
    """Seed test users and a published job for report/moderation tests."""
    async with AsyncSessionLocal() as db:
        hashed = get_password_hash(PASSWORD)
        users = []
        for email, name in [
            (OWNER_EMAIL, "Report Owner"),
            (REPORTER_EMAIL, "Report Reporter"),
            (RECRUITER_EMAIL, "Report Recruiter"),
            (SECOND_REPORTER_EMAIL, "Second Reporter"),
        ]:
            user = User(
                email=email,
                email_normalized=email.lower(),
                password_hash=hashed,
                role="USER",
                full_name=name,
                email_verified_at=datetime.now(timezone.utc),
                status=UserStatus.ACTIVE,
            )
            db.add(user)
            users.append(user)
        await db.flush()

        owner, reporter, recruiter, second_reporter = users

        result = await db.execute(
            select(Company).where(Company.slug == "test-corp")
        )
        company = result.scalar_one()

        db.add(
            CompanyMembership(
                company_id=company.id,
                user_id=owner.id,
                role=CompanyMemberRole.OWNER,
                status=CompanyMembershipStatus.ACTIVE,
            )
        )
        db.add(
            CompanyMembership(
                company_id=company.id,
                user_id=recruiter.id,
                role=CompanyMemberRole.RECRUITER,
                status=CompanyMembershipStatus.ACTIVE,
            )
        )
        await db.flush()

        cat_result = await db.execute(
            select(JobCategory).where(JobCategory.slug == "it")
        )
        category = cat_result.scalar_one()

        region_result = await db.execute(
            select(Region).where(Region.slug == "baki")
        )
        region = region_result.scalar_one()

        job = Job(
            company_id=company.id,
            category_id=category.id,
            region_id=region.id,
            title="Report Test Job",
            slug=f"report-test-job-{uuid.uuid4().hex[:8]}",
            description="Job for report testing",
            status=JobStatus.PUBLISHED,
            location="Baki",
            salary_min=1500,
            salary_max=3000,
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
        db.add(job)
        await db.commit()

    yield

    async with AsyncSessionLocal() as db:
        user_emails = [
            OWNER_EMAIL,
            REPORTER_EMAIL,
            RECRUITER_EMAIL,
            SECOND_REPORTER_EMAIL,
        ]
        user_rows = await db.execute(
            select(User.id).where(User.email.in_(user_emails))
        )
        user_ids = [row[0] for row in user_rows.all()]

        if user_ids:
            await db.execute(
                Notification.__table__.delete().where(
                    Notification.user_id.in_(user_ids)
                )
            )
            report_rows = await db.execute(
                select(Report.id).where(Report.reporter_id.in_(user_ids))
            )
            report_ids = [row[0] for row in report_rows.all()]
            if report_ids:
                await db.execute(
                    ReportHistory.__table__.delete().where(
                        ReportHistory.report_id.in_(report_ids)
                    )
                )
                await db.execute(
                    Report.__table__.delete().where(
                        Report.id.in_(report_ids)
                    )
                )
            await db.execute(
                AuditLog.__table__.delete().where(
                    AuditLog.actor_id.in_(user_ids)
                )
            )
            await db.execute(
                CompanyMembership.__table__.delete().where(
                    CompanyMembership.user_id.in_(user_ids)
                )
            )
            await db.execute(
                User.__table__.delete().where(User.id.in_(user_ids))
            )
        await db.commit()


@pytest_asyncio.fixture
async def client(db_ready):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ====================================================================
# A. Report Creation (6 tests)
# ====================================================================


async def test_create_job_report(client, report_users):
    job_id = await _get_published_job_id()
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "This job is spam"
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert "id" in data
    assert data["status"] == "OPEN"


async def test_create_company_report(client, report_users):
    company_id = await _get_test_corp_id()
    res = await _create_report_via_api(
        client, "COMPANY", company_id, "SCAM", "This company is a scam"
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert "id" in data
    assert data["status"] == "OPEN"


async def test_create_report_invalid_target(client, report_users):
    fake_id = str(uuid.uuid4())
    res = await _create_report_via_api(client, "JOB", fake_id, "SPAM")
    assert res.status_code == 404


async def test_create_report_unauthenticated(client, report_users):
    job_id = await _get_published_job_id()
    res = await client.post(
        "/api/v1/reports/",
        json={
            "target_type": "JOB",
            "target_id": job_id,
            "reason": "SPAM",
            "description": "Unauthenticated report",
        },
    )
    assert res.status_code in (401, 403)


async def test_create_report_duplicate_reason(client, report_users):
    job_id = await _get_published_job_id()
    res1 = await _create_report_via_api(
        client, "JOB", job_id, "FRAUD", "Duplicate test"
    )
    assert res1.status_code == 201, res1.text
    res2 = await _create_report_via_api(
        client, "JOB", job_id, "FRAUD", "Duplicate test again"
    )
    assert res2.status_code == 400


async def test_create_report_different_reason(client, report_users):
    job_id = await _get_published_job_id()
    res = await _create_report_via_api(
        client, "JOB", job_id, "MISLEADING_INFORMATION", "Different reason"
    )
    assert res.status_code == 201, res.text


# ====================================================================
# B. My Reports (3 tests)
# ====================================================================


async def test_list_my_reports(client, report_users):
    token = await login(client, REPORTER_EMAIL)
    res = await client.get(
        "/api/v1/reports/mine",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 1
    reasons = {r["reason"] for r in data["items"]}
    assert "SPAM" in reasons or "FRAUD" in reasons


async def test_list_my_reports_empty(client, report_users):
    token = await login(client, SECOND_REPORTER_EMAIL)
    res = await client.get(
        "/api/v1/reports/mine",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 0
    assert data["items"] == []


async def test_my_reports_other_user_invisible(client, report_users):
    token = await login(client, SECOND_REPORTER_EMAIL)
    res = await client.get(
        "/api/v1/reports/mine",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    for item in data["items"]:
        assert item["reason"] != "SPAM" or item.get("description") != "This job is spam"


# ====================================================================
# C. Admin Queue (5 tests)
# ====================================================================


async def test_admin_list_reports(client, report_users):
    token = await login(client, ADMIN_EMAIL)
    res = await client.get(
        "/api/v1/admin/reports/",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 1


async def test_admin_list_reports_filter_status(client, report_users):
    token = await login(client, ADMIN_EMAIL)
    res = await client.get(
        "/api/v1/admin/reports/?status=OPEN",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    for item in data["items"]:
        assert item["status"] == "OPEN"


async def test_admin_list_reports_filter_target_type(client, report_users):
    token = await login(client, ADMIN_EMAIL)
    res = await client.get(
        "/api/v1/admin/reports/?target_type=JOB",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    for item in data["items"]:
        assert item["target_type"] == "JOB"


async def test_admin_reports_forbidden_for_recruiter(client, report_users):
    token = await login(client, RECRUITER_EMAIL)
    res = await client.get(
        "/api/v1/admin/reports/",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 403


async def test_admin_reports_forbidden_for_candidate(client, report_users):
    token = await login(client, "candidate@joblane.az")
    res = await client.get(
        "/api/v1/admin/reports/",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 403


# ====================================================================
# D. Admin Report Detail (3 tests)
# ====================================================================


async def test_admin_get_report_detail(client, report_users):
    job_id = await _create_job_in_db("Detail Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Detail test", reporter_email=OWNER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    res = await client.get(
        f"/api/v1/admin/reports/{report_id}",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["id"] == report_id
    assert "history" in data
    assert len(data["history"]) >= 1
    assert data["history"][0]["action"] == "CREATED"


async def test_admin_get_report_not_found(client, report_users):
    fake_id = str(uuid.uuid4())
    token = await login(client, ADMIN_EMAIL)
    res = await client.get(
        f"/api/v1/admin/reports/{fake_id}",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 404


async def test_admin_get_report_shows_snapshot(client, report_users):
    job_id = await _create_job_in_db("Snapshot Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Snapshot test", reporter_email=RECRUITER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    res = await client.get(
        f"/api/v1/admin/reports/{report_id}",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["target_snapshot"] is not None
    assert "title" in data["target_snapshot"]
    assert "company_name" in data["target_snapshot"]


# ====================================================================
# E. Assignment (3 tests)
# ====================================================================


async def test_admin_assign_report(client, report_users):
    job_id = await _create_job_in_db("Assign Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Assign test", reporter_email=SECOND_REPORTER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "UNDER_REVIEW"


async def test_admin_assign_report_to_other(client, report_users):
    job_id = await _create_job_in_db("Assign Other Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Assign other test"
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    moderator_id = await _get_user_id("moderator@joblane.az")
    assert moderator_id is not None

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={"assignee_id": str(moderator_id)},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["assigned_to"] == str(moderator_id)


async def test_admin_assign_already_assigned(client, report_users):
    job_id = await _create_job_in_db("Reassign Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Reassign test", reporter_email=RECRUITER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    res1 = await client.post(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={},
        headers=headers,
    )
    assert res1.status_code == 200, res1.text

    res2 = await client.post(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={},
        headers=headers,
    )
    assert res2.status_code == 200, res2.text
    assert res2.json()["status"] == "UNDER_REVIEW"


# ====================================================================
# F. Priority (2 tests)
# ====================================================================


async def test_admin_change_priority(client, report_users):
    job_id = await _create_job_in_db("Priority Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Priority test", reporter_email=SECOND_REPORTER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/admin/reports/{report_id}/priority",
        json={"priority": "HIGH"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["priority"] == "HIGH"


async def test_admin_change_priority_invalid_value(client, report_users):
    job_id = await _create_job_in_db("Invalid Priority Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Invalid priority test", reporter_email=OWNER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/admin/reports/{report_id}/priority",
        json={"priority": "INVALID"},
        headers=headers,
    )
    assert res.status_code == 422


# ====================================================================
# G. Mark Duplicate (2 tests)
# ====================================================================


async def test_admin_mark_duplicate(client, report_users):
    job_id = await _create_job_in_db("Dup Source Job")
    res1 = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Dup source", reporter_email=RECRUITER_EMAIL
    )
    assert res1.status_code == 201, res1.text
    source_id = res1.json()["id"]

    res2 = await _create_report_via_api(
        client, "JOB", job_id, "MISLEADING_INFORMATION", "Dup target", reporter_email=RECRUITER_EMAIL
    )
    assert res2.status_code == 201, res2.text
    target_id = res2.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{source_id}/duplicate",
        json={"duplicate_of_report_id": target_id},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "DUPLICATE"
    assert data["duplicate_of"] == target_id


async def test_admin_mark_duplicate_self_reference(client, report_users):
    job_id = await _create_job_in_db("Self Dup Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Self dup test", reporter_email=SECOND_REPORTER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/duplicate",
        json={"duplicate_of_report_id": report_id},
        headers=headers,
    )
    assert res.status_code == 400


# ====================================================================
# H. Dismiss (2 tests)
# ====================================================================


async def test_admin_dismiss_report(client, report_users):
    job_id = await _create_job_in_db("Dismiss Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Dismiss test", reporter_email=OWNER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/dismiss",
        json={"resolution_note": "No violation found"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "DISMISSED"


async def test_admin_dismiss_creates_notification(client, report_users):
    job_id = await _create_job_in_db("Dismiss Notif Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Dismiss notif test", reporter_email=SECOND_REPORTER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/dismiss",
        json={"resolution_note": "No violation"},
        headers=headers,
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        reporter_id = await _get_user_id(SECOND_REPORTER_EMAIL)
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == reporter_id,
                Notification.type == NotificationType.REPORT_RESOLVED,
                Notification.entity_id == report_id,
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None


# ====================================================================
# I. Confirm Violation (2 tests)
# ====================================================================


async def test_admin_confirm_violation(client, report_users):
    job_id = await _create_job_in_db("Confirm Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Confirm test", reporter_email=RECRUITER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/confirm",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "ACTION_REQUIRED"


async def test_admin_confirm_already_resolved(client, report_users):
    job_id = await _create_job_in_db("Confirm Resolved Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Confirm resolved test", reporter_email=OWNER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve",
        json={"resolution": "NO_VIOLATION", "resolution_note": "Resolved"},
        headers=headers,
    )
    assert res.status_code == 200, res.text

    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/confirm",
        headers=headers,
    )
    assert res.status_code == 400


# ====================================================================
# J. Resolve (3 tests)
# ====================================================================


async def test_admin_resolve_report(client, report_users):
    job_id = await _create_job_in_db("Resolve Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Resolve test", reporter_email=SECOND_REPORTER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve",
        json={
            "resolution": "CONTENT_REMOVED",
            "resolution_note": "Job removed for spam",
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "RESOLVED"
    assert data["resolution"] == "CONTENT_REMOVED"


async def test_admin_resolve_with_reporter_message(client, report_users):
    job_id = await _create_job_in_db("Resolve Message Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Resolve message test", reporter_email=RECRUITER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    msg = "Your report has been reviewed and action taken."
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve",
        json={
            "resolution": "CONTENT_REMOVED",
            "resolution_note": "Spam confirmed",
            "reporter_message": msg,
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Report).where(Report.id == report_id)
        )
        report = result.scalar_one()
        assert report.reporter_message == msg


async def test_admin_resolve_creates_notification(client, report_users):
    job_id = await _create_job_in_db("Resolve Notif Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "Resolve notif test", reporter_email=OWNER_EMAIL
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve",
        json={"resolution": "WARNING_ISSUED", "resolution_note": "Warning"},
        headers=headers,
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        reporter_id = await _get_user_id(OWNER_EMAIL)
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == reporter_id,
                Notification.type == NotificationType.REPORT_RESOLVED,
                Notification.entity_id == report_id,
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None


# ====================================================================
# K. Job Action Integration (2 tests)
# ====================================================================


async def test_admin_pause_job_from_report(client, report_users):
    job_id = await _create_job_in_db("Pause Test Job")

    token = await login(client, REPORTER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/reports/",
        json={
            "target_type": "JOB",
            "target_id": job_id,
            "reason": "SPAM",
            "description": "Pause action test",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    admin_token = await login(client, ADMIN_EMAIL)
    admin_headers = await csrf_headers(admin_token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/actions/job",
        json={"action": "PAUSE", "reason": "Spam job"},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "RESOLVED"

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one()
        assert job.status == JobStatus.PAUSED


async def test_admin_archive_job_from_report(client, report_users):
    job_id = await _create_job_in_db("Archive Test Job")

    token = await login(client, REPORTER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/reports/",
        json={
            "target_type": "JOB",
            "target_id": job_id,
            "reason": "SCAM",
            "description": "Archive action test",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    admin_token = await login(client, ADMIN_EMAIL)
    admin_headers = await csrf_headers(admin_token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/actions/job",
        json={"action": "ARCHIVE", "reason": "Scam job"},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "RESOLVED"

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one()
        assert job.status == JobStatus.ARCHIVED


async def test_admin_suspend_company_from_report(client, report_users):
    company_id = await _get_test_corp_id()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Company).where(Company.id == company_id))
        company = result.scalar_one()
        company.status = CompanyStatus.VERIFIED
        await db.commit()

    res = await _create_report_via_api(
        client, "COMPANY", company_id, "SCAM", "Suspend action test",
        reporter_email=SECOND_REPORTER_EMAIL,
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    admin_token = await login(client, ADMIN_EMAIL)
    admin_headers = await csrf_headers(admin_token)
    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/actions/company",
        json={"action": "SUSPEND", "reason": "Scam company"},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "RESOLVED"
    assert data["resolution"] == "COMPANY_ACTION_TAKEN"

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Company).where(Company.id == company_id))
        company = result.scalar_one()
        assert company.status == CompanyStatus.SUSPENDED


# ====================================================================
# L. Blocklist (4 tests)
# ====================================================================


async def test_blocklist_create_email(client, report_users):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    email_val = f"blocked-{uuid.uuid4().hex[:8]}@test.az"
    res = await client.post(
        "/api/v1/admin/blocklist/",
        json={
            "type": "EMAIL",
            "value": email_val,
            "reason": "Spam email",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["type"] == "EMAIL"
    assert data["value"] == email_val.lower()
    assert data["status"] == "ACTIVE"


async def test_blocklist_create_domain(client, report_users):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)
    domain = f"blocked-{uuid.uuid4().hex[:8]}.az"
    res = await client.post(
        "/api/v1/admin/blocklist/",
        json={
            "type": "EMAIL_DOMAIN",
            "value": domain,
            "reason": "Spam domain",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["type"] == "EMAIL_DOMAIN"
    assert data["status"] == "ACTIVE"


async def test_blocklist_deactivate(client, report_users):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    email_val = f"deactivate-{uuid.uuid4().hex[:8]}@test.az"
    res = await client.post(
        "/api/v1/admin/blocklist/",
        json={
            "type": "EMAIL",
            "value": email_val,
            "reason": "Temp block",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    entry_id = res.json()["id"]

    res = await client.delete(
        f"/api/v1/admin/blocklist/{entry_id}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "INACTIVE"


async def test_blocklist_forbidden_for_moderator(client, report_users):
    token = await login(client, "moderator@joblane.az")
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/admin/blocklist/",
        json={
            "type": "EMAIL",
            "value": f"mod-test-{uuid.uuid4().hex[:8]}@test.az",
            "reason": "Should fail",
        },
        headers=headers,
    )
    assert res.status_code == 403


# ====================================================================
# M. Report History (1 test)
# ====================================================================


async def test_report_history_recorded(client, report_users):
    job_id = await _create_job_in_db("History Test Job")
    res = await _create_report_via_api(
        client, "JOB", job_id, "SPAM", "History test"
    )
    assert res.status_code == 201, res.text
    report_id = res.json()["id"]

    admin_token = await login(client, ADMIN_EMAIL)
    admin_headers = await csrf_headers(admin_token)

    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text

    res = await client.patch(
        f"/api/v1/admin/reports/{report_id}/priority",
        json={"priority": "HIGH"},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text

    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/confirm",
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text

    res = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve",
        json={"resolution": "CONTENT_REMOVED", "resolution_note": "Removed"},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text

    res = await client.get(
        f"/api/v1/admin/reports/{report_id}",
        headers={"X-CSRF-Token": admin_token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    history = data["history"]
    actions = [h["action"] for h in history]
    assert "CREATED" in actions
    assert "ASSIGNED" in actions
    assert "PRIORITY_CHANGED" in actions
    assert "VIOLATION_CONFIRMED" in actions
    assert "RESOLVED" in actions


# ====================================================================
# N. CSRF (1 test)
# ====================================================================


async def test_report_requires_csrf(client, report_users):
    job_id = await _get_published_job_id()
    await login(client, REPORTER_EMAIL)
    res = await client.post(
        "/api/v1/reports/",
        json={
            "target_type": "JOB",
            "target_id": job_id,
            "reason": "SPAM",
            "description": "CSRF test",
        },
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 403
