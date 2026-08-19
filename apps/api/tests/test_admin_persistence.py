"""Final pre-merge audit tests: real persistence, RBAC, audit log.

Covers: company verify/suspend, user suspend/revoke-sessions, category/
industry/region changes, internship moderation, training moderation,
advertisement create/edit. All against the real PostgreSQL test database.
"""
import uuid

import pytest
from conftest import login, csrf_headers, ADMIN_EMAIL, PASSWORD
from sqlalchemy import select

from app.auth.models import User
from app.admin.models import (
    Advertisement,
    AuditLog,
    Company,
    Industry,
    Internship,
    JobCategory,
    Region,
    Training,
)


async def add_user(db, email: str, role: str) -> User:
    from app.auth.security import get_password_hash
    from app.auth.models import UserStatus
    from datetime import datetime, timezone

    user = User(
        email=email,
        email_normalized=email.lower(),
        password_hash=get_password_hash(PASSWORD),
        role=role,
        full_name=f"Test {role}",
        email_verified_at=datetime.now(timezone.utc),
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    await db.flush()
    return user


@pytest.fixture(scope="module")
async def extra_roles(db_ready):
    """Create AD_MANAGER and CONTENT_MANAGER users for RBAC tests."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await add_user(db, "admanager@audit.az", "AD_MANAGER")
        await add_user(db, "contentmanager@audit.az", "CONTENT_MANAGER")
        await db.commit()
    yield
    async with AsyncSessionLocal() as db:
        from sqlalchemy import delete
        await db.execute(delete(User).where(User.email.in_(["admanager@audit.az", "contentmanager@audit.az"])))
        await db.commit()


async def db_get(model, **filters):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(model).filter_by(**filters))
        return result.scalar_one_or_none()


async def audit_actions(db_ready, entity_type: str, action: str) -> list:
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AuditLog).where(AuditLog.entity_type == entity_type, AuditLog.action == action)
        )
        return list(result.scalars())


# ---------- Company verify / suspend / edit ----------

@pytest.mark.asyncio
async def test_company_verify_suspend_edit_persists(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    res = await client.post(
        "/api/v1/admin/companies",
        json={
            "name": "Audit Corp",
            "slug": f"audit-corp-{uuid.uuid4().hex[:8]}",
            "website": "https://audit.az",
            "email": "info@audit.az",
            "phone": "+994500000001",
            "description": "audit company",
            "status": "PENDING",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    company_id = res.json()["id"]

    # verify
    res = await client.post(
        f"/api/v1/admin/companies/{company_id}/status",
        json={"action": "verify", "reason": "audit"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "VERIFIED"

    # suspend
    res = await client.post(
        f"/api/v1/admin/companies/{company_id}/status",
        json={"action": "suspend", "reason": "audit suspend"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SUSPENDED"

    # activate
    res = await client.post(
        f"/api/v1/admin/companies/{company_id}/status",
        json={"action": "activate"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ACTIVE"

    # PATCH persists
    res = await client.patch(
        f"/api/v1/admin/companies/{company_id}",
        json={"description": "updated audit description", "website": "https://new.audit.az"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["description"] == "updated audit description"

    # GET confirms persistence
    res = await client.get(f"/api/v1/admin/companies/{company_id}", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ACTIVE"
    assert body["description"] == "updated audit description"
    assert body["website"] == "https://new.audit.az"

    # direct DB check
    row = await db_get(Company, id=uuid.UUID(company_id))
    assert row is not None
    assert row.status.value == "ACTIVE"
    assert row.description == "updated audit description"


# ---------- User suspend + revoke sessions ----------

@pytest.mark.asyncio
async def test_user_suspend_and_revoke_sessions_persists(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    # target: the audit AD_MANAGER user (not needed for other tests)
    users_res = await client.get("/api/v1/admin/users", params={"q": "admanager@audit.az"}, headers=headers)
    users = users_res.json()["items"]
    assert users, "audit user not found"
    target = [u for u in users if u["email"] == "admanager@audit.az"][0]
    target_id = target["id"]

    # suspend
    res = await client.post(
        f"/api/v1/admin/users/{target_id}/status",
        json={"action": "suspend", "reason": "audit"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SUSPENDED"

    # suspended user can no longer authenticate
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admanager@audit.az", "password": PASSWORD},
    )
    assert res.status_code in (401, 403), res.text

    # revoke sessions
    res = await client.post(
        f"/api/v1/admin/users/{target_id}/revoke-sessions",
        json={"reason": "audit revoke"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SUSPENDED"

    # unsuspend restores access
    res = await client.post(
        f"/api/v1/admin/users/{target_id}/status",
        json={"action": "unsuspend"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ACTIVE"

    row = await db_get(User, email="admanager@audit.az")
    assert row is not None and row.status.value == "ACTIVE"


# ---------- Category / Industry / Region ----------

@pytest.mark.asyncio
async def test_category_industry_region_changes_persist(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    # Category
    res = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Audit Category", "slug": f"audit-cat-{uuid.uuid4().hex[:8]}", "sort_order": 7},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    cat_id = res.json()["id"]
    res = await client.patch(f"/api/v1/admin/categories/{cat_id}", json={"sort_order": 42}, headers=headers)
    assert res.status_code == 200, res.text
    res = await client.post(f"/api/v1/admin/categories/{cat_id}/status", json={"action": "deactivate"}, headers=headers)
    assert res.status_code == 200, res.text
    res = await client.post(f"/api/v1/admin/categories/{cat_id}/status", json={"action": "activate"}, headers=headers)
    assert res.status_code == 200, res.text
    res = await client.post(f"/api/v1/admin/categories/{cat_id}/status", json={"action": "archive"}, headers=headers)
    assert res.status_code == 200, res.text
    row = await db_get(JobCategory, id=uuid.UUID(cat_id))
    assert row is not None and row.sort_order == 42 and row.is_active is False

    # Industry
    res = await client.post(
        "/api/v1/admin/industries",
        json={"name": "Audit Industry", "slug": f"audit-ind-{uuid.uuid4().hex[:8]}", "sort_order": 3},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    ind_id = res.json()["id"]
    res = await client.patch(f"/api/v1/admin/industries/{ind_id}", json={"description": "audit industry desc"}, headers=headers)
    assert res.status_code == 200, res.text
    res = await client.post(f"/api/v1/admin/industries/{ind_id}/status", json={"action": "deactivate"}, headers=headers)
    assert res.status_code == 200, res.text
    row = await db_get(Industry, id=uuid.UUID(ind_id))
    assert row is not None and row.is_active is False and row.description == "audit industry desc"

    # Region
    res = await client.post(
        "/api/v1/admin/regions",
        json={"name": "Audit Region", "slug": f"audit-reg-{uuid.uuid4().hex[:8]}", "country": "Azərbaycan", "city": "Bakı"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    reg_id = res.json()["id"]
    res = await client.patch(f"/api/v1/admin/regions/{reg_id}", json={"city": "Sumqayıt"}, headers=headers)
    assert res.status_code == 200, res.text
    res = await client.post(f"/api/v1/admin/regions/{reg_id}/status", json={"action": "deactivate"}, headers=headers)
    assert res.status_code == 200, res.text
    row = await db_get(Region, id=uuid.UUID(reg_id))
    assert row is not None and row.is_active is False and row.city == "Sumqayıt"


# ---------- Internship moderation ----------

@pytest.mark.asyncio
async def test_internship_moderation_persists(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    companies = await client.get("/api/v1/admin/companies", params={"limit": 1}, headers=headers)
    company_id = companies.json()["items"][0]["id"]

    res = await client.post(
        "/api/v1/admin/internships",
        json={
            "company_id": company_id,
            "title": "Audit Internship",
            "slug": f"audit-intern-{uuid.uuid4().hex[:8]}",
            "description": "internship desc",
            "requirements": "none",
            "location": "Bakı",
            "status": "DRAFT",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    intern_id = res.json()["id"]

    res = await client.patch(f"/api/v1/admin/internships/{intern_id}", json={"requirements": "SQL basic"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["requirements"] == "SQL basic"

    for action, expected in [("approve", "APPROVED"), ("publish", "PUBLISHED"), ("unpublish", "PAUSED")]:
        res = await client.post(
            f"/api/v1/admin/internships/{intern_id}/status",
            json={"action": action, "note": "audit"},
            headers=headers,
        )
        assert res.status_code == 200, res.text
        assert res.json()["status"] == expected, res.text

    res = await client.post(
        f"/api/v1/admin/internships/{intern_id}/status",
        json={"action": "archive"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ARCHIVED"

    res = await client.get(f"/api/v1/admin/internships/{intern_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["requirements"] == "SQL basic"
    row = await db_get(Internship, id=uuid.UUID(intern_id))
    assert row is not None and row.status.value == "ARCHIVED" and row.requirements == "SQL basic"


# ---------- Training moderation ----------

@pytest.mark.asyncio
async def test_training_moderation_persists(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    companies = await client.get("/api/v1/admin/companies", params={"limit": 1}, headers=headers)
    provider_id = companies.json()["items"][0]["id"]

    res = await client.post(
        "/api/v1/admin/trainings",
        json={
            "provider_id": provider_id,
            "title": "Audit Training",
            "slug": f"audit-training-{uuid.uuid4().hex[:8]}",
            "description": "training desc",
            "price": 199.5,
            "currency": "AZN",
            "status": "DRAFT",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    training_id = res.json()["id"]

    res = await client.patch(f"/api/v1/admin/trainings/{training_id}", json={"price": 249.0}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["price"] == 249.0

    for action, expected in [("approve", "APPROVED"), ("publish", "PUBLISHED")]:
        res = await client.post(
            f"/api/v1/admin/trainings/{training_id}/status",
            json={"action": action, "note": "audit"},
            headers=headers,
        )
        assert res.status_code == 200, res.text
        assert res.json()["status"] == expected, res.text

    row = await db_get(Training, id=uuid.UUID(training_id))
    assert row is not None and row.status.value == "PUBLISHED" and row.price == 249.0


# ---------- Advertisement create/edit (real DB) ----------

@pytest.mark.asyncio
async def test_advertisement_create_edit_persists(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    res = await client.post(
        "/api/v1/admin/ads",
        json={
            "advertiser_name": "Audit Advertiser",
            "campaign_name": "Audit Campaign",
            "headline": "Audit headline",
            "destination_url": "https://example.com/audit",
            "placement": "INLINE_FEED",
            "format": "728x90",
            "priority": 11,
            "status": "DRAFT",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    ad_id = res.json()["id"]

    res = await client.patch(
        f"/api/v1/admin/ads/{ad_id}",
        json={"headline": "Audit headline edited", "priority": 55},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["headline"] == "Audit headline edited"
    assert res.json()["priority"] == 55

    row = await db_get(Advertisement, id=uuid.UUID(ad_id))
    assert row is not None
    assert row.headline == "Audit headline edited"
    assert row.priority == 55
    assert row.placement.value == "INLINE_FEED"
    assert row.format.value == "728x90"


# ---------- RBAC: server-side denials ----------

@pytest.mark.asyncio
async def test_rbac_denies_unauthorized_actions(client, extra_roles):
    # MODERATOR cannot manage ads, users, categories, or create companies
    await login(client, "moderator@joblane.az")
    mod_headers = await csrf_headers(client.cookies.get("csrf_token"))

    res = await client.post(
        "/api/v1/admin/ads",
        json={"advertiser_name": "X", "campaign_name": "Y", "placement": "TOP_LEADERBOARD", "format": "970x90"},
        headers=mod_headers,
    )
    assert res.status_code == 403, res.text

    res = await client.post("/api/v1/admin/categories", json={"name": "X", "slug": "x"}, headers=mod_headers)
    assert res.status_code == 403, res.text

    res = await client.post("/api/v1/admin/companies", json={"name": "X", "slug": "x"}, headers=mod_headers)
    assert res.status_code == 403, res.text

    # AD_MANAGER cannot moderate jobs
    token = await login(client, "admanager@audit.az")
    ad_headers = await csrf_headers(token)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1}, headers=ad_headers)
    job_id = jobs_res.json()["items"][0]["id"]
    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/moderation",
        json={"decision": "approve"},
        headers=ad_headers,
    )
    assert res.status_code == 403, res.text

    # CONTENT_MANAGER cannot manage ads or companies
    token2 = await login(client, "contentmanager@audit.az")
    cm_headers = await csrf_headers(token2)
    res = await client.post(
        "/api/v1/admin/ads",
        json={"advertiser_name": "X", "campaign_name": "Y", "placement": "TOP_LEADERBOARD", "format": "970x90"},
        headers=cm_headers,
    )
    assert res.status_code == 403, res.text

    # Regular USER blocked from all admin endpoints
    await login(client, "candidate@joblane.az")
    user_headers = await csrf_headers(client.cookies.get("csrf_token"))
    res = await client.get("/api/v1/admin/me", headers=user_headers)
    assert res.status_code == 403, res.text


# ---------- Audit log for important mutations ----------

@pytest.mark.asyncio
async def test_audit_log_rows_for_important_mutations(client, extra_roles):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    company_res = await client.post(
        "/api/v1/admin/companies",
        json={"name": "Audit Log Corp", "slug": f"audit-log-{uuid.uuid4().hex[:8]}"},
        headers=headers,
    )
    company_id = company_res.json()["id"]
    await client.post(
        f"/api/v1/admin/companies/{company_id}/status",
        json={"action": "verify", "reason": "audit log check"},
        headers=headers,
    )

    ad_res = await client.post(
        "/api/v1/admin/ads",
        json={
            "advertiser_name": "Audit Log Advertiser",
            "campaign_name": "Audit Log Campaign",
            "placement": "TOP_LEADERBOARD",
            "format": "970x90",
            "status": "DRAFT",
        },
        headers=headers,
    )
    ad_id = ad_res.json()["id"]
    await client.post(
        f"/api/v1/admin/ads/{ad_id}/status",
        json={"action": "activate", "reason": "audit log check"},
        headers=headers,
    )

    companies = await client.get("/api/v1/admin/companies", params={"limit": 1}, headers=headers)
    company_id2 = companies.json()["items"][0]["id"]
    intern_res = await client.post(
        "/api/v1/admin/internships",
        json={"company_id": company_id2, "title": "Audit Log Intern", "slug": f"audit-log-int-{uuid.uuid4().hex[:8]}"},
        headers=headers,
    )
    intern_id = intern_res.json()["id"]
    await client.post(
        f"/api/v1/admin/internships/{intern_id}/status",
        json={"action": "approve", "note": "audit log check"},
        headers=headers,
    )

    rows = await audit_actions(None, "company", "company.verified")
    assert any(str(r.entity_id) == company_id for r in rows)
    rows = await audit_actions(None, "advertisement", "ad.activated")
    assert any(str(r.entity_id) == ad_id for r in rows)
    rows = await audit_actions(None, "internship", "internship.approved")
    assert any(str(r.entity_id) == intern_id for r in rows)