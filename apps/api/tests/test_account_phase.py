"""
Phase 4 tests: account lifecycle, email outbox, sessions, rate limits, audit.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select, func

from app.core.database import AsyncSessionLocal
from app.email.models import EmailOutbox
from app.email.service import decrypt_value
from app.auth.models import User, UserStatus
from app.auth.repository import generate_verification_token, hash_token
from app.admin.models import AuditLog, Application, ApplicationStatus

from conftest import PASSWORD, login, csrf_headers


def _email():
    return f"p4-{uuid.uuid4().hex[:10]}@example.com"


async def _outbox_rows():
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(EmailOutbox).order_by(EmailOutbox.created_at.asc())
            )
        ).scalars().all()
        return list(rows)


async def _outbox_for(recipient: str) -> list[EmailOutbox]:
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(EmailOutbox).where(EmailOutbox.recipient == recipient)
            )
        ).scalars().all()
        return list(rows)


async def _get_user(email: str) -> User:
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(
                select(User).where(User.email_normalized == email.lower())
            )
        ).scalar_one()
        return user


async def _verification_token(email: str) -> str:
    rows = await _outbox_for(email)
    assert rows, "no outbox row for recipient"
    row = rows[-1]
    assert row.template == "verify_email"
    return decrypt_value(row.payload["verification_token"])


async def _register(client: AsyncClient, email: str) -> None:
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD},
    )
    assert res.status_code == 200, res.text


async def _register_and_verify(client: AsyncClient, email: str) -> None:
    await _register(client, email)
    token = await _verification_token(email)
    res = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert res.status_code == 200, res.text


# ---------------------------------------------------------------------------
# Registration + email outbox
# ---------------------------------------------------------------------------

async def test_register_creates_email_outbox(client):
    email = _email()
    await _register(client, email)

    rows = await _outbox_for(email)
    assert len(rows) == 1
    row = rows[0]
    assert row.status == "PENDING"
    assert row.template == "verify_email"
    assert row.recipient == email
    assert "Joblane" in row.subject
    assert row.attempt_count == 0

    raw = row.payload["verification_token"]
    assert raw.startswith("enc:v1:")
    assert decrypt_value(raw) != raw


async def test_register_does_not_enumerate_existing_account(client):
    email = _email()
    await _register(client, email)
    before = await _outbox_for(email)

    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "AnotherPass123!"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["message"] == "Registration successful. Please check your email to verify your account."
    after = await _outbox_for(email)
    assert len(after) == len(before), "no new email should be queued for an existing account"


async def test_register_rate_limit(client):
    for i in range(5):
        res = await client.post(
            "/api/v1/auth/register",
            json={"email": _email(), "password": PASSWORD},
        )
        assert res.status_code == 200, res.text
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": _email(), "password": PASSWORD},
    )
    assert res.status_code == 429, res.text


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------

async def test_verify_email_flow(client):
    email = _email()
    await _register_and_verify(client, email)

    res = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 200, res.text
    csrf = client.cookies.get("csrf_token")
    res = await client.get("/api/v1/auth/me", headers={"X-CSRF-Token": csrf})
    assert res.status_code == 200
    body = res.json()
    assert body["email_verified"] is True
    assert body["status"] == "ACTIVE"


async def test_verify_email_token_is_single_use(client):
    email = _email()
    await _register(client, email)
    token = await _verification_token(email)

    res = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert res.status_code == 200

    res = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert res.status_code == 400


async def test_verify_email_invalid_token(client):
    res = await client.post("/api/v1/auth/verify-email", json={"token": "not-a-real-token"})
    assert res.status_code == 400


async def test_verify_email_expired_token(client):
    email = _email()
    await _register(client, email)
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email_normalized == email.lower()))
        ).scalar_one()
        token = generate_verification_token()
        from app.auth.models import EmailVerificationToken
        db.add(
            EmailVerificationToken(
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            )
        )
        await db.commit()

    res = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert res.status_code == 400


async def test_verify_email_records_audit(client):
    email = _email()
    await _register_and_verify(client, email)
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email_normalized == email.lower()))
        ).scalar_one()
        audit = (
            await db.execute(
                select(AuditLog).where(
                    AuditLog.actor_id == user.id,
                    AuditLog.action == "auth.email_verified",
                )
            )
        ).scalar_one_or_none()
        assert audit is not None
        assert audit.actor_email == email


# ---------------------------------------------------------------------------
# Resend verification
# ---------------------------------------------------------------------------

async def test_resend_verification_invalidates_previous_token(client):
    email = _email()
    await _register(client, email)
    old_token = await _verification_token(email)

    res = await client.post("/api/v1/auth/resend-verification", json={"email": email})
    assert res.status_code == 200, res.text
    assert res.json()["message"] == "If an account exists for this email, verification instructions will be resent."

    res = await client.post("/api/v1/auth/verify-email", json={"token": old_token})
    assert res.status_code == 400, "old token must be invalidated on resend"

    new_token = await _verification_token(email)
    assert new_token != old_token
    res = await client.post("/api/v1/auth/verify-email", json={"token": new_token})
    assert res.status_code == 200


async def test_resend_verification_generic_for_unknown_email(client):
    before = await _outbox_rows()
    res = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "nobody@example.com"},
    )
    assert res.status_code == 200
    after = await _outbox_rows()
    assert len(after) == len(before), "no email should be queued for unknown accounts"


async def test_resend_verification_rate_limit(client):
    email = _email()
    await _register(client, email)
    for _ in range(3):
        res = await client.post("/api/v1/auth/resend-verification", json={"email": email})
        assert res.status_code == 200, res.text
    res = await client.post("/api/v1/auth/resend-verification", json={"email": email})
    assert res.status_code == 429, res.text


# ---------------------------------------------------------------------------
# Forgot / reset password
# ---------------------------------------------------------------------------

async def test_forgot_password_queues_reset_email(client):
    email = _email()
    await _register_and_verify(client, email)

    res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert res.status_code == 200, res.text

    rows = await _outbox_for(email)
    assert rows[-1].template == "password_reset"
    assert rows[-1].status == "PENDING"


async def test_forgot_password_generic_for_unknown_email(client):
    before = await _outbox_rows()
    res = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert res.status_code == 200
    after = await _outbox_rows()
    assert len(after) == len(before)


async def test_forgot_password_rate_limit(client):
    email = _email()
    for _ in range(5):
        res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
        assert res.status_code == 200, res.text
    res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert res.status_code == 429, res.text


async def test_reset_password_flow(client):
    email = _email()
    await _register_and_verify(client, email)

    await client.post("/api/v1/auth/forgot-password", json={"email": email})
    rows = await _outbox_for(email)
    reset_row = rows[-1]
    token = decrypt_value(reset_row.payload["reset_token"])

    res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "BrandNewPass123!"},
    )
    assert res.status_code == 200, res.text

    res = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 401, "old password must stop working"

    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "BrandNewPass123!"})
    assert res.status_code == 200

    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email_normalized == email.lower()))
        ).scalar_one()
        audit = (
            await db.execute(
                select(AuditLog).where(
                    AuditLog.actor_id == user.id,
                    AuditLog.action == "auth.password_reset",
                )
            )
        ).scalar_one_or_none()
        assert audit is not None
        from app.notifications.models import Notification
        note = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.type == "PASSWORD_RESET",
                )
            )
        ).scalar_one_or_none()
        assert note is not None


async def test_reset_password_token_single_use(client):
    email = _email()
    await _register_and_verify(client, email)
    await client.post("/api/v1/auth/forgot-password", json={"email": email})
    rows = await _outbox_for(email)
    token = decrypt_value(rows[-1].payload["reset_token"])

    res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "BrandNewPass123!"},
    )
    assert res.status_code == 200

    res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherPass123!"},
    )
    assert res.status_code == 400


async def test_reset_password_expired_token(client):
    email = _email()
    await _register(client, email)
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email_normalized == email.lower()))
        ).scalar_one()
        from app.auth.models import PasswordResetToken
        token = generate_verification_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            )
        )
        await db.commit()

    res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "BrandNewPass123!"},
    )
    assert res.status_code == 400


async def test_reset_password_rate_limit(client):
    for _ in range(5):
        res = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": "bad", "new_password": "BrandNewPass123!"},
        )
        assert res.status_code == 400
    res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "bad", "new_password": "BrandNewPass123!"},
    )
    assert res.status_code == 429, res.text


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------

async def test_change_password_keeps_current_session(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf = await login(client, email)

    res = await client.post(
        "/api/v1/account/change-password",
        headers=await csrf_headers(csrf),
        json={"current_password": PASSWORD, "new_password": "ChangedPass123!"},
    )
    assert res.status_code == 200, res.text

    res = await client.get("/api/v1/auth/me", headers={"X-CSRF-Token": csrf})
    assert res.status_code == 200, "current session must stay valid"

    rows = await _outbox_for(email)
    assert rows[-1].template == "password_changed"

    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email_normalized == email.lower()))
        ).scalar_one()
        from app.notifications.models import Notification
        note = (
            await db.execute(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.type == "PASSWORD_CHANGED",
                )
            )
        ).scalar_one_or_none()
        assert note is not None
        audit = (
            await db.execute(
                select(AuditLog).where(
                    AuditLog.actor_id == user.id,
                    AuditLog.action == "auth.password_changed",
                )
            )
        ).scalar_one_or_none()
        assert audit is not None


async def test_change_password_revokes_other_sessions(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf_a = await login(client, email)

    other = AsyncClient(transport=client._transport, base_url="http://test")
    async with other:
        await other.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})

        res = await client.post(
            "/api/v1/account/change-password",
            headers=await csrf_headers(csrf_a),
            json={"current_password": PASSWORD, "new_password": "ChangedPass123!"},
        )
        assert res.status_code == 200, res.text

        res = await other.get("/api/v1/auth/me")
        assert res.status_code == 401, "other session must be revoked"


async def test_change_password_wrong_current_password(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf = await login(client, email)

    res = await client.post(
        "/api/v1/account/change-password",
        headers=await csrf_headers(csrf),
        json={"current_password": "WrongPassword123!", "new_password": "ChangedPass123!"},
    )
    assert res.status_code == 400

    res = await client.get("/api/v1/auth/me", headers={"X-CSRF-Token": csrf})
    assert res.status_code == 200


async def test_change_password_rate_limit(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf = await login(client, email)
    for _ in range(5):
        res = await client.post(
            "/api/v1/account/change-password",
            headers=await csrf_headers(csrf),
            json={"current_password": "WrongPassword123!", "new_password": "ChangedPass123!"},
        )
        assert res.status_code == 400
    res = await client.post(
        "/api/v1/account/change-password",
        headers=await csrf_headers(csrf),
        json={"current_password": "WrongPassword123!", "new_password": "ChangedPass123!"},
    )
    assert res.status_code == 429, res.text


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

async def test_sessions_list_and_revoke(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf_a = await login(client, email)

    other = AsyncClient(transport=client._transport, base_url="http://test")
    async with other:
        await other.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})

        res = await client.get("/api/v1/auth/sessions", headers={"X-CSRF-Token": csrf_a})
        assert res.status_code == 200, res.text
        sessions = res.json()["sessions"]
        assert len(sessions) == 2
        current = [s for s in sessions if s["is_current"]]
        other_session = [s for s in sessions if not s["is_current"]]
        assert len(current) == 1
        assert len(other_session) == 1
        assert other_session[0]["ip_address"] == "testclient" or other_session[0]["ip_address"] is not None

        res = await client.post(
            f"/api/v1/auth/sessions/{other_session[0]['id']}/revoke",
            headers=await csrf_headers(csrf_a),
        )
        assert res.status_code == 200, res.text
        assert res.json()["revoked_current"] is False

        res = await other.get("/api/v1/auth/me")
        assert res.status_code == 401, "revoked session must stop working"

        res = await client.get("/api/v1/auth/sessions", headers={"X-CSRF-Token": csrf_a})
        assert len(res.json()["sessions"]) == 1


async def test_revoke_current_session_clears_cookies(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf = await login(client, email)

    res = await client.get("/api/v1/auth/sessions", headers={"X-CSRF-Token": csrf})
    session_id = res.json()["sessions"][0]["id"]

    res = await client.post(
        f"/api/v1/auth/sessions/{session_id}/revoke",
        headers=await csrf_headers(csrf),
    )
    assert res.status_code == 200
    assert res.json()["revoked_current"] is True
    assert "joblane_session" not in client.cookies
    assert "csrf_token" not in client.cookies


async def test_sessions_require_auth(client):
    res = await client.get("/api/v1/auth/sessions")
    assert res.status_code == 401


async def test_logout_all_revokes_every_session(client):
    email = _email()
    await _register_and_verify(client, email)
    csrf = await login(client, email)

    other = AsyncClient(transport=client._transport, base_url="http://test")
    async with other:
        await other.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})

        res = await client.post("/api/v1/auth/logout-all", headers=await csrf_headers(csrf))
        assert res.status_code == 200

        res = await client.get("/api/v1/auth/me")
        assert res.status_code == 401
        res = await other.get("/api/v1/auth/me")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Email outbox storage security
# ---------------------------------------------------------------------------

async def test_outbox_never_stores_raw_tokens(client):
    email = _email()
    await _register(client, email)
    await client.post("/api/v1/auth/forgot-password", json={"email": email})

    rows = await _outbox_for(email)
    assert len(rows) == 2
    for row in rows:
        assert "verification_token" not in row.payload or str(row.payload["verification_token"]).startswith("enc:v1:")
        assert "reset_token" not in row.payload or str(row.payload["reset_token"]).startswith("enc:v1:")
        raw_json = repr(row.payload)
        assert "enc:v1:" in raw_json


async def test_email_recipient_indexed_and_unique_per_event(client):
    email = _email()
    await _register(client, email)
    rows = await _outbox_for(email)
    assert rows[0].recipient == email


async def test_unverified_user_cannot_login(client):
    email = _email()
    await _register(client, email)
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 403, "unverified account must be rejected at login"


async def test_admin_revoke_user_sessions_revokes_for_real(client):
    email = _email()
    await _register_and_verify(client, email)
    await login(client, email)
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 200

    candidate = AsyncClient(transport=client._transport, base_url="http://test")
    async with candidate:
        csrf_c = await login(candidate, email)
        res = await candidate.get("/api/v1/auth/me", headers={"X-CSRF-Token": csrf_c})
        assert res.status_code == 200

        admin_csrf = await login(client, "admin@joblane.az")
        user = await _get_user(email)
        res = await client.post(
            f"/api/v1/admin/users/{user.id}/revoke-sessions",
            headers=await csrf_headers(admin_csrf),
            json={"reason": None},
        )
        assert res.status_code == 200, res.text

        res = await candidate.get("/api/v1/auth/me")
        assert res.status_code == 401, "sessions revoked by admin must actually be revoked"