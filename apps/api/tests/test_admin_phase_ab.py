import pytest
from conftest import login, csrf_headers, ADMIN_EMAIL, MODERATOR_EMAIL, PASSWORD
from sqlalchemy import select, func
from app.admin.models import AuditLog

@pytest.mark.asyncio
async def test_unauthorized_admin_me_401(client):
    res = await client.get("/api/v1/admin/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_and_me(client):
    token = await login(client, ADMIN_EMAIL)
    res = await client.get("/api/v1/admin/me")
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == "SUPER_ADMIN"
    assert "jobs.moderate" in body["permissions"]
    assert "jobs.promote" in body["permissions"]
    assert token


@pytest.mark.asyncio
async def test_dashboard_real_counts(client):
    await login(client, ADMIN_EMAIL)
    res = await client.get("/api/v1/admin/dashboard")
    assert res.status_code == 200
    body = res.json()
    assert body["jobs"]["total"] == 7
    assert body["jobs"]["by_status"]["PENDING_REVIEW"] == 6
    assert body["users"]["total"] == 3
    assert body["users"]["admins"] == 2
    assert len(body["moderation_queue"]) == 6
    status = body["system_status"]
    assert status["api"] is True
    assert status["database"] is True
    assert status["redis"] is True
    assert status["mail"] in (True, False, None)
    assert "checked_at" in status


@pytest.mark.asyncio
async def test_csrf_required_for_mutation(client):
    await login(client, ADMIN_EMAIL)
    res = await client.post(
        "/api/v1/admin/jobs/00000000-0000-0000-0000-000000000000/status",
        json={"action": "pause"},
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_moderator_approve_creates_history_and_audit(client):
    await login(client, MODERATOR_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]

    token = client.cookies.get("csrf_token")
    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/moderation",
        json={"decision": "approve", "note": "pytest approve"},
        headers=await csrf_headers(token),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "APPROVED"
    assert len(body["moderation_history"]) == 1
    assert body["moderation_history"][0]["to_status"] == "APPROVED"

    audit = await client.get("/api/v1/admin/dashboard")
    actions = [e["action"] for e in audit.json()["recent_audit"]]
    assert "job.approved" in actions


@pytest.mark.asyncio
async def test_moderator_reject_requires_reason(client):
    await login(client, MODERATOR_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]

    token = client.cookies.get("csrf_token")
    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/moderation",
        json={"decision": "reject"},
        headers=await csrf_headers(token),
    )
    assert res.status_code == 400

    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/moderation",
        json={"decision": "reject", "reason": "Sənədlər əskikdir"},
        headers=await csrf_headers(token),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "REJECTED"
    assert body["moderation_reason"] == "Sənədlər əskikdir"


@pytest.mark.asyncio
async def test_moderator_cannot_promote(client):
    await login(client, MODERATOR_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]
    token = client.cookies.get("csrf_token")

    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/premium",
        json={"enabled": True},
        headers=await csrf_headers(token),
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_premium_featured_urgent(client):
    await login(client, ADMIN_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]
    token = client.cookies.get("csrf_token")
    h = await csrf_headers(token)

    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/premium",
        json={"enabled": True, "end_at": "2026-12-31T00:00:00Z"},
        headers=h,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_premium"] is True
    assert body["premium_until"] is not None

    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/featured",
        json={"enabled": True, "end_at": "2026-12-31T00:00:00Z"},
        headers=h,
    )
    assert res.status_code == 200
    assert res.json()["is_featured"] is True

    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/urgent",
        json={"enabled": True, "end_at": "2026-12-31T00:00:00Z"},
        headers=h,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_urgent"] is True
    assert body["urgent_until"] is not None


@pytest.mark.asyncio
async def test_premium_end_before_start_rejected(client):
    await login(client, ADMIN_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]
    token = client.cookies.get("csrf_token")

    res = await client.post(
        f"/api/v1/admin/jobs/{job_id}/premium",
        json={"enabled": True, "start_at": "2026-12-31T00:00:00Z", "end_at": "2026-01-01T00:00:00Z"},
        headers=await csrf_headers(token),
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_publish_unpublish_flow(client):
    await login(client, ADMIN_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]
    token = client.cookies.get("csrf_token")
    h = await csrf_headers(token)

    res = await client.post(f"/api/v1/admin/jobs/{job_id}/moderation", json={"decision": "approve"}, headers=h)
    assert res.status_code == 200

    res = await client.post(f"/api/v1/admin/jobs/{job_id}/status", json={"action": "publish"}, headers=h)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "PUBLISHED"

    res = await client.post(f"/api/v1/admin/jobs/{job_id}/status", json={"action": "unpublish"}, headers=h)
    assert res.status_code == 200
    assert res.json()["status"] == "PAUSED"

    res = await client.post(f"/api/v1/admin/jobs/{job_id}/moderation", json={"decision": "reject", "reason": "x"}, headers=h)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_regular_user_blocked(client):
    await login(client, "candidate@joblane.az")
    res = await client.get("/api/v1/admin/jobs")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_audit_rows_recorded_for_mutations(client):
    from app.core.database import AsyncSessionLocal

    await login(client, ADMIN_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "PENDING_REVIEW", "limit": 1})
    job_id = jobs_res.json()["items"][0]["id"]
    token = client.cookies.get("csrf_token")

    await client.post(
        f"/api/v1/admin/jobs/{job_id}/premium",
        json={"enabled": True},
        headers=await csrf_headers(token),
    )

    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count()).select_from(AuditLog))).scalar_one()
        assert count >= 1


@pytest.mark.asyncio
async def test_job_detail_includes_history(client):
    await login(client, ADMIN_EMAIL)
    jobs_res = await client.get("/api/v1/admin/jobs", params={"status": "APPROVED", "limit": 1})
    assert jobs_res.status_code == 200
    items = jobs_res.json()["items"]
    assert len(items) == 1

    res = await client.get(f"/api/v1/admin/jobs/{items[0]['id']}")
    assert res.status_code == 200
    body = res.json()
    assert body["moderation_history"]
    assert body["company_name"] == "Test Corp"
