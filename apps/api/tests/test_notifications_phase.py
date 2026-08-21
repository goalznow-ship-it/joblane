"""
Phase 4 tests: in-app notifications API and event integrations.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy import select, func

from app.core.database import AsyncSessionLocal
from app.auth.models import User
from app.admin.models import (
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyMemberRole,
    Job,
    JobStatus,
    Application,
    ApplicationStatus,
)

from conftest import PASSWORD, login, csrf_headers, ADMIN_EMAIL, MODERATOR_EMAIL


def _email():
    return f"p4n-{uuid.uuid4().hex[:10]}@example.com"


async def _user(email: str) -> User:
    async with AsyncSessionLocal() as db:
        return (
            await db.execute(
                select(User).where(User.email_normalized == email.lower())
            )
        ).scalar_one()


async def _ensure_user(email: str) -> User:
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(
                select(User).where(User.email_normalized == email.lower())
            )
        ).scalar_one_or_none()
        if user is None:
            from datetime import datetime, timezone
            from app.auth.security import get_password_hash
            from app.auth.models import UserStatus
            user = User(
                email=email,
                email_normalized=email.lower(),
                password_hash=get_password_hash(PASSWORD),
                role="USER",
                status=UserStatus.ACTIVE,
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(user)
            await db.flush()
            await db.commit()
        return user


async def _create_notifications(email: str, count: int) -> list[uuid.UUID]:
    from app.notifications.service import create_notification
    user = await _ensure_user(email)
    ids = []
    async with AsyncSessionLocal() as db:
        for i in range(count):
            n = await create_notification(
                db,
                user_id=user.id,
                type="APPLICATION_STATUS",
                title=f"Test bildiriş {i}",
                message=f"Mesaj {i}",
                entity_type="application",
                entity_id=str(uuid.uuid4()),
                action_url="/candidate/applications",
            )
            ids.append(n.id)
        await db.commit()
    return ids


async def test_notifications_require_auth(client):
    res = await client.get("/api/v1/notifications")
    assert res.status_code == 401


async def test_notifications_list_and_unread_count(client):
    email = _email()
    await _create_notifications(email, 3)
    csrf = await login(client, email)

    res = await client.get("/api/v1/notifications", headers={"X-CSRF-Token": csrf})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total"] == 3
    assert body["unread_count"] == 3
    assert len(body["items"]) == 3
    newest = body["items"][0]
    assert newest["is_read"] is False
    assert newest["type"] == "APPLICATION_STATUS"
    assert newest["action_url"] == "/candidate/applications"

    res = await client.get("/api/v1/notifications/unread-count", headers={"X-CSRF-Token": csrf})
    assert res.status_code == 200
    assert res.json()["unread_count"] == 3


async def test_mark_one_read(client):
    email = _email()
    ids = await _create_notifications(email, 2)
    csrf = await login(client, email)

    res = await client.post(
        f"/api/v1/notifications/{ids[0]}/read",
        headers=await csrf_headers(csrf),
    )
    assert res.status_code == 200, res.text
    assert res.json()["unread_count"] == 1

    res = await client.get("/api/v1/notifications", headers={"X-CSRF-Token": csrf})
    items = res.json()["items"]
    by_id = {str(i["id"]): i for i in items}
    assert by_id[str(ids[0])]["is_read"] is True
    assert by_id[str(ids[1])]["is_read"] is False


async def test_mark_all_read(client):
    email = _email()
    await _create_notifications(email, 3)
    csrf = await login(client, email)

    res = await client.post("/api/v1/notifications/read-all", headers=await csrf_headers(csrf))
    assert res.status_code == 200, res.text
    assert res.json()["unread_count"] == 0

    res = await client.get("/api/v1/notifications/unread-count", headers={"X-CSRF-Token": csrf})
    assert res.json()["unread_count"] == 0


async def test_notification_ownership_isolation(client):
    owner_email = _email()
    ids = await _create_notifications(owner_email, 1)
    intruder_email = _email()
    await _create_notifications(intruder_email, 1)
    csrf = await login(client, intruder_email)

    res = await client.post(
        f"/api/v1/notifications/{ids[0]}/read",
        headers=await csrf_headers(csrf),
    )
    assert res.status_code == 404, "another user's notification must not be readable"

    res = await client.get("/api/v1/notifications", headers={"X-CSRF-Token": csrf})
    assert res.json()["total"] == 1


async def test_notifications_pagination(client):
    email = _email()
    await _create_notifications(email, 5)
    csrf = await login(client, email)

    res = await client.get(
        "/api/v1/notifications?page=1&page_size=2",
        headers={"X-CSRF-Token": csrf},
    )
    body = res.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2
    assert body["page"] == 1

    res = await client.get(
        "/api/v1/notifications?page=3&page_size=2",
        headers={"X-CSRF-Token": csrf},
    )
    assert len(res.json()["items"]) == 1


async def test_notifications_newest_first(client):
    email = _email()
    ids = await _create_notifications(email, 3)
    csrf = await login(client, email)
    res = await client.get("/api/v1/notifications", headers={"X-CSRF-Token": csrf})
    items = res.json()["items"]
    assert [str(i["id"]) for i in items] == [str(ids[2]), str(ids[1]), str(ids[0])]


async def test_job_moderation_notifies_company_members(client):
    from app.admin.models import Company, JobCategory, Region, JobModerationHistory

    candidate = await _user("candidate@joblane.az")

    async with AsyncSessionLocal() as db:
        company = (
            await db.execute(
                select(CompanyMembership).where(CompanyMembership.user_id == candidate.id)
            )
        ).scalar_one_or_none()
        if company is None:
            test_corp = (
                await db.execute(select(Company).where(Company.slug == "test-corp"))
            ).scalar_one()
            db.add(
                CompanyMembership(
                    company_id=test_corp.id,
                    user_id=candidate.id,
                    role=CompanyMemberRole.VIEWER,
                    status=CompanyMembershipStatus.ACTIVE,
                )
            )
        category = (
            await db.execute(select(JobCategory).where(JobCategory.slug == "it"))
        ).scalar_one()
        region = (
            await db.execute(select(Region).where(Region.slug == "baki"))
        ).scalar_one()
        test_corp = (
            await db.execute(select(Company).where(Company.slug == "test-corp"))
        ).scalar_one()
        slug = f"notif-pending-{uuid.uuid4().hex[:8]}"
        job = Job(
            company_id=test_corp.id,
            category_id=category.id,
            region_id=region.id,
            title="Notif Pending Job",
            slug=slug,
            description="desc",
            status=JobStatus.PENDING_REVIEW,
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
        db.add(job)
        await db.flush()
        job_id = job.id
        await db.commit()

    csrf = await login(client, MODERATOR_EMAIL)
    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/moderation",
        headers=await csrf_headers(csrf),
        json={"decision": "approve"},
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        from app.notifications.models import Notification
        note = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == candidate.id,
                    Notification.type == "JOB_APPROVED",
                    Notification.entity_id == str(job_id),
                )
            )
        ).scalar_one_or_none()
        assert note is not None, "company members must be notified on job approval"
        assert note.action_url == "/employer/jobs"


async def test_application_status_change_notifies_candidate(client):
    from app.admin.models import Company, JobCategory, Region

    candidate = await _user("candidate@joblane.az")

    async with AsyncSessionLocal() as db:
        test_corp = (
            await db.execute(select(Company).where(Company.slug == "test-corp"))
        ).scalar_one()
        membership = (
            await db.execute(
                select(CompanyMembership).where(
                    CompanyMembership.company_id == test_corp.id,
                    CompanyMembership.user_id == candidate.id,
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            db.add(
                CompanyMembership(
                    company_id=test_corp.id,
                    user_id=candidate.id,
                    role=CompanyMemberRole.VIEWER,
                    status=CompanyMembershipStatus.ACTIVE,
                )
            )
        else:
            membership.role = CompanyMemberRole.VIEWER
        admin = (
            await db.execute(select(User).where(User.email_normalized == ADMIN_EMAIL.lower()))
        ).scalar_one()
        admin_membership = (
            await db.execute(
                select(CompanyMembership).where(
                    CompanyMembership.company_id == test_corp.id,
                    CompanyMembership.user_id == admin.id,
                )
            )
        ).scalar_one_or_none()
        if admin_membership is None:
            db.add(
                CompanyMembership(
                    company_id=test_corp.id,
                    user_id=admin.id,
                    role=CompanyMemberRole.OWNER,
                    status=CompanyMembershipStatus.ACTIVE,
                )
            )

        category = (
            await db.execute(select(JobCategory).where(JobCategory.slug == "it"))
        ).scalar_one()
        region = (
            await db.execute(select(Region).where(Region.slug == "baki"))
        ).scalar_one()
        slug = f"notif-approved-{uuid.uuid4().hex[:8]}"
        job = Job(
            company_id=test_corp.id,
            category_id=category.id,
            region_id=region.id,
            title="Notif Approved Job",
            slug=slug,
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
        db.add(job)
        await db.flush()
        app = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            status=ApplicationStatus.SUBMITTED,
        )
        db.add(app)
        await db.flush()
        application_id = app.id
        await db.commit()

    csrf = await login(client, ADMIN_EMAIL)
    res = await client.patch(
        f"/api/v1/employer/applications/{application_id}/status",
        headers=await csrf_headers(csrf),
        json={"status": "SHORTLISTED"},
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        from app.notifications.models import Notification
        note = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == candidate.id,
                    Notification.type == "APPLICATION_STATUS",
                    Notification.entity_id == str(application_id),
                )
            )
        ).scalar_one_or_none()
        assert note is not None, "candidate must be notified on application status change"
        assert "SHORTLISTED" in note.message or "namizəd" in note.message


async def test_company_status_change_notifies_owner(client):
    candidate = await _user("candidate@joblane.az")
    async with AsyncSessionLocal() as db:
        from app.admin.models import Company
        test_corp = (
            await db.execute(select(Company).where(Company.slug == "test-corp"))
        ).scalar_one()
        membership = (
            await db.execute(
                select(CompanyMembership).where(
                    CompanyMembership.company_id == test_corp.id,
                    CompanyMembership.user_id == candidate.id,
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            db.add(
                CompanyMembership(
                    company_id=test_corp.id,
                    user_id=candidate.id,
                    role=CompanyMemberRole.OWNER,
                    status=CompanyMembershipStatus.ACTIVE,
                )
            )
        else:
            membership.role = CompanyMemberRole.OWNER
        await db.commit()

    csrf = await login(client, MODERATOR_EMAIL)
    res = await client.post(
        f"/api/v1/admin/companies/{test_corp.id}/status",
        headers=await csrf_headers(csrf),
        json={"action": "suspend", "reason": "Test"},
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        from app.notifications.models import Notification
        note = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == candidate.id,
                    Notification.type == "COMPANY_REJECTED",
                    Notification.entity_id == str(test_corp.id),
                )
            )
        ).scalar_one_or_none()
        assert note is not None, "company owner must be notified on status change"
        assert note.action_url == "/employer/company"


async def test_user_status_change_notifies_user(client):
    email = _email()
    async with AsyncSessionLocal() as db:
        from app.auth.security import get_password_hash
        from app.auth.models import UserStatus
        from datetime import datetime, timezone
        user = User(
            email=email,
            email_normalized=email.lower(),
            password_hash=get_password_hash(PASSWORD),
            role="USER",
            status=UserStatus.ACTIVE,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()
        user_id = user.id
        await db.commit()

    csrf = await login(client, ADMIN_EMAIL)
    res = await client.post(
        f"/api/v1/admin/users/{user_id}/status",
        headers=await csrf_headers(csrf),
        json={"action": "suspend", "reason": "Test səbəb"},
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        from app.notifications.models import Notification
        note = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.type == "ACCOUNT_SUSPENDED",
                )
            )
        ).scalar_one_or_none()
        assert note is not None
        assert "Test səbəb" in note.message