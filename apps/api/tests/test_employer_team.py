"""
End-to-end tests for the employer team management feature.

Covers: listing team members, invitation CRUD, preview/accept flow,
role changes, suspend/reactivate, member removal, leave company,
ownership transfer, tenant isolation, and permission enforcement.
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
    Company,
    CompanyMemberRole,
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyStatus,
)
from app.employer.models import CompanyInvitation, InvitationStatus
from app.employer.team_service import generate_invite_token, hash_token
from app.email.models import EmailOutbox

from tests.conftest import ADMIN_EMAIL, PASSWORD, login, csrf_headers

# -- test user emails ---------------------------------------------------

OWNER_EMAIL = "team.owner@joblane.az"
ADMIN_EMAIL_T = "team.admin@joblane.az"
RECRUITER_EMAIL = "team.recruiter@joblane.az"
VIEWER_EMAIL = "team.viewer@joblane.az"
TARGET_EMAIL = "team.target@joblane.az"
OTHER_OWNER_EMAIL = "team.other.owner@joblane.az"

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


async def _company_id_of(db, user_id) -> uuid.UUID:
    result = await db.execute(
        select(CompanyMembership.company_id).where(CompanyMembership.user_id == user_id)
    )
    return result.scalar_one()


async def _get_membership_id(db, user_email: str) -> uuid.UUID:
    result = await db.execute(
        select(CompanyMembership.id)
        .join(User, User.id == CompanyMembership.user_id)
        .where(User.email == user_email)
    )
    return result.scalar_one()


# -- module-scoped fixture: seed all team test data ---------------------

@pytest_asyncio.fixture(scope="module")
async def employer_users(db_ready):
    """Seed users, companies, and memberships for team management tests."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner = await _make_user(db, OWNER_EMAIL, "Team Owner")
        admin = await _make_user(db, ADMIN_EMAIL_T, "Team Admin")
        recruiter = await _make_user(db, RECRUITER_EMAIL, "Team Recruiter")
        viewer = await _make_user(db, VIEWER_EMAIL, "Team Viewer")
        target = await _make_user(db, TARGET_EMAIL, "Team Target")
        other_owner = await _make_user(db, OTHER_OWNER_EMAIL, "Other Owner")
        await db.flush()

        company_a = Company(
            name="Team Test Corp",
            slug="team-test-corp",
            description="Seeded team test company",
            status=CompanyStatus.PENDING,
        )
        db.add(company_a)
        await db.flush()

        company_b = Company(
            name="Other Corp",
            slug="other-corp",
            description="Seeded other company",
            status=CompanyStatus.PENDING,
        )
        db.add(company_b)
        await db.flush()

        for user, role in [
            (owner, CompanyMemberRole.OWNER),
            (admin, CompanyMemberRole.ADMIN),
            (recruiter, CompanyMemberRole.RECRUITER),
            (viewer, CompanyMemberRole.VIEWER),
        ]:
            db.add(
                CompanyMembership(
                    company_id=company_a.id,
                    user_id=user.id,
                    role=role,
                    status=CompanyMembershipStatus.ACTIVE,
                )
            )

        db.add(
            CompanyMembership(
                company_id=company_b.id,
                user_id=other_owner.id,
                role=CompanyMemberRole.OWNER,
                status=CompanyMembershipStatus.ACTIVE,
            )
        )
        await db.commit()

    yield

    async with AsyncSessionLocal() as db:
        from app.admin.models import AuditLog

        user_rows = await db.execute(
            select(User.id).where(
                User.email.in_([
                    OWNER_EMAIL, ADMIN_EMAIL_T, RECRUITER_EMAIL,
                    VIEWER_EMAIL, TARGET_EMAIL, OTHER_OWNER_EMAIL,
                ])
            )
        )
        user_ids = [row[0] for row in user_rows.all()]

        company_rows = await db.execute(
            select(CompanyMembership.company_id).where(
                CompanyMembership.user_id.in_(user_ids)
            )
        )
        all_company_ids = list(set(row[0] for row in company_rows.all()))

        await db.execute(AuditLog.__table__.delete().where(AuditLog.actor_id.in_(user_ids)))
        await db.execute(
            CompanyInvitation.__table__.delete().where(
                CompanyInvitation.company_id.in_(all_company_ids)
            )
        )
        await db.execute(
            CompanyMembership.__table__.delete().where(
                CompanyMembership.user_id.in_(user_ids)
            )
        )
        await db.execute(
            Company.__table__.delete().where(Company.id.in_(all_company_ids))
        )
        await db.execute(User.__table__.delete().where(User.id.in_(user_ids)))
        await db.commit()
    await engine.dispose()


# -- function-scoped client fixture ------------------------------------

@pytest_asyncio.fixture
async def client(db_ready):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# -- helpers for creating invitations with known tokens ----------------

async def _create_invitation_directly(
    db, company_id, email, role, invited_by_id, token=None
):
    if token is None:
        token = generate_invite_token()
    token_hashed = hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = CompanyInvitation(
        company_id=company_id,
        email=email,
        email_normalized=email.strip().lower(),
        role=role,
        status=InvitationStatus.PENDING,
        invited_by=invited_by_id,
        token_hash=token_hashed,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()
    return invitation, token


async def _create_expired_invitation_directly(db, company_id, email, role, invited_by_id):
    token = generate_invite_token()
    token_hashed = hash_token(token)
    expires_at = datetime.now(timezone.utc) - timedelta(days=1)

    invitation = CompanyInvitation(
        company_id=company_id,
        email=email,
        email_normalized=email.strip().lower(),
        role=role,
        status=InvitationStatus.PENDING,
        invited_by=invited_by_id,
        token_hash=token_hashed,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()
    return invitation, token


# ======================================================================
# A. List team members
# ======================================================================

async def test_list_team_members(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    res = await client.get("/api/v1/employer/team/", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 4
    roles = {m["role"] for m in data["items"]}
    assert roles == {"OWNER", "ADMIN", "RECRUITER", "VIEWER"}


async def test_list_team_members_forbidden_for_viewer(client, employer_users):
    token = await login(client, VIEWER_EMAIL)
    res = await client.get("/api/v1/employer/team/", headers={"X-CSRF-Token": token})
    assert res.status_code == 403
    assert "icazəniz yoxdur" in res.json()["detail"]


async def test_tenant_isolation_list_members(client, employer_users):
    token = await login(client, OTHER_OWNER_EMAIL)
    res = await client.get("/api/v1/employer/team/", headers={"X-CSRF-Token": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["role"] == "OWNER"


# ======================================================================
# B. Create invitation
# ======================================================================

async def test_create_invitation_as_owner(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": TARGET_EMAIL, "role": "RECRUITER"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["email"] == TARGET_EMAIL
    assert data["role"] == "RECRUITER"
    assert data["status"] == "PENDING"
    assert "id" in data


async def test_create_invitation_as_admin(client, employer_users):
    token = await login(client, ADMIN_EMAIL_T)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": "admin.invitee@joblane.az", "role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    assert res.json()["role"] == "VIEWER"


async def test_create_invitation_forbidden_for_recruiter(client, employer_users):
    token = await login(client, RECRUITER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": "recruiter.invitee@joblane.az", "role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 403


async def test_create_invitation_forbidden_for_viewer(client, employer_users):
    token = await login(client, VIEWER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": "viewer.invitee@joblane.az", "role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 403


async def test_create_invitation_already_active_member(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": ADMIN_EMAIL_T, "role": "RECRUITER"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "aktiv üzv" in res.json()["detail"]


async def test_create_invitation_duplicate_pending(client, employer_users):
    from app.core.database import AsyncSessionLocal

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    email = f"dup.pending.{uuid.uuid4().hex[:6]}@joblane.az"

    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": email, "role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    first_id = res.json()["id"]

    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": email, "role": "RECRUITER"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    second_id = res.json()["id"]
    assert first_id != second_id

    async with AsyncSessionLocal() as db:
        old = await db.get(CompanyInvitation, uuid.UUID(first_id))
        assert old.status == InvitationStatus.REVOKED


async def test_create_invitation_invalid_role(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": "invalidrole@joblane.az", "role": "OWNER"},
        headers=headers,
    )
    assert res.status_code == 422


async def test_create_invitation_sends_email(client, employer_users):
    from app.core.database import AsyncSessionLocal

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    email = f"emailtest.{uuid.uuid4().hex[:6]}@joblane.az"

    res = await client.post(
        "/api/v1/employer/team/invitations",
        json={"email": email, "role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 201, res.text

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(EmailOutbox).where(EmailOutbox.recipient == email)
        )
        email_row = result.scalar_one_or_none()
        assert email_row is not None
        assert email_row.template == "team_invitation"


# ======================================================================
# C. List invitations
# ======================================================================

async def test_list_invitations(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    res = await client.get(
        "/api/v1/employer/team/invitations",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 1
    emails = {inv["email"] for inv in data["items"]}
    assert TARGET_EMAIL in emails


async def test_list_invitations_filter_status(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    res = await client.get(
        "/api/v1/employer/team/invitations?status=PENDING",
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    for inv in data["items"]:
        assert inv["status"] == "PENDING"


# ======================================================================
# D. Revoke invitation
# ======================================================================

async def test_revoke_invitation(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        inv, _ = await _create_invitation_directly(
            db,
            company_id,
            f"revoke.target.{uuid.uuid4().hex[:6]}@joblane.az",
            "VIEWER",
            owner_user.id,
        )
        invitation_id = inv.id
        await db.commit()

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.delete(
        f"/api/v1/employer/team/invitations/{invitation_id}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "REVOKED"


async def test_revoke_invitation_already_accepted(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        inv, _ = await _create_invitation_directly(
            db,
            company_id,
            f"accepted.inv.{uuid.uuid4().hex[:6]}@joblane.az",
            "VIEWER",
            owner_user.id,
        )
        inv.status = InvitationStatus.ACCEPTED
        invitation_id = inv.id
        await db.commit()

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.delete(
        f"/api/v1/employer/team/invitations/{invitation_id}",
        headers=headers,
    )
    assert res.status_code == 400
    assert "ləğv edilib və ya qəbul olunub" in res.json()["detail"]


async def test_revoke_invitation_tenant_isolation(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_a_id = await _company_id_of(db, owner_user.id)
        inv, _ = await _create_invitation_directly(
            db,
            company_a_id,
            f"tenant.revoke.{uuid.uuid4().hex[:6]}@joblane.az",
            "VIEWER",
            owner_user.id,
        )
        invitation_id = inv.id
        await db.commit()

    token = await login(client, OTHER_OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.delete(
        f"/api/v1/employer/team/invitations/{invitation_id}",
        headers=headers,
    )
    assert res.status_code == 404
    assert "tapılmadı" in res.json()["detail"]


# ======================================================================
# E. Resend invitation
# ======================================================================

async def test_resend_invitation(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        inv, _ = await _create_invitation_directly(
            db,
            company_id,
            f"resend.target.{uuid.uuid4().hex[:6]}@joblane.az",
            "RECRUITER",
            owner_user.id,
        )
        old_token_hash = inv.token_hash
        invitation_id = inv.id
        await db.commit()

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/employer/team/invitations/{invitation_id}/resend",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "PENDING"

    async with AsyncSessionLocal() as db:
        updated = await db.get(CompanyInvitation, invitation_id)
        assert updated.token_hash != old_token_hash


async def test_resend_invitation_not_pending(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        inv, _ = await _create_invitation_directly(
            db,
            company_id,
            f"resend.accepted.{uuid.uuid4().hex[:6]}@joblane.az",
            "VIEWER",
            owner_user.id,
        )
        inv.status = InvitationStatus.ACCEPTED
        invitation_id = inv.id
        await db.commit()

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/employer/team/invitations/{invitation_id}/resend",
        headers=headers,
    )
    assert res.status_code == 400
    assert "aktiv dəvətləri" in res.json()["detail"]


# ======================================================================
# F. Preview invitation
# ======================================================================

async def test_preview_invitation(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        inv, raw_token = await _create_invitation_directly(
            db,
            company_id,
            f"preview.target.{uuid.uuid4().hex[:6]}@joblane.az",
            "ADMIN",
            owner_user.id,
        )
        await db.commit()

    res = await client.get(
        f"/api/v1/employer/invitations/preview?token={raw_token}"
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["company_name"] == "Team Test Corp"
    assert data["email"] == inv.email
    assert data["role"] == "ADMIN"
    assert data["status"] == "PENDING"


async def test_preview_invitation_invalid_token(client, employer_users):
    res = await client.get(
        "/api/v1/employer/invitations/preview?token=definitely-invalid-token-12345"
    )
    assert res.status_code == 404
    assert "tapılmadı" in res.json()["detail"]


async def test_preview_invitation_expired(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        _, raw_token = await _create_expired_invitation_directly(
            db,
            company_id,
            f"expired.preview.{uuid.uuid4().hex[:6]}@joblane.az",
            "VIEWER",
            owner_user.id,
        )
        await db.commit()

    res = await client.get(
        f"/api/v1/employer/invitations/preview?token={raw_token}"
    )
    assert res.status_code == 400
    assert "müddəti bitib" in res.json()["detail"]


# ======================================================================
# G. Accept invitation
# ======================================================================

async def test_accept_invitation(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        _, raw_token = await _create_invitation_directly(
            db,
            company_id,
            TARGET_EMAIL,
            "RECRUITER",
            owner_user.id,
        )
        await db.commit()

    token = await login(client, TARGET_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/invitations/accept",
        json={"token": raw_token},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["role"] == "RECRUITER"
    assert data["status"] == "ACTIVE"
    assert data["user_email"] == TARGET_EMAIL


async def test_accept_invitation_wrong_email(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        _, raw_token = await _create_invitation_directly(
            db,
            company_id,
            f"wrongemail.{uuid.uuid4().hex[:6]}@joblane.az",
            "VIEWER",
            owner_user.id,
        )
        await db.commit()

    # Admin tries to accept an invitation meant for someone else
    token = await login(client, ADMIN_EMAIL_T)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/invitations/accept",
        json={"token": raw_token},
        headers=headers,
    )
    assert res.status_code == 400
    assert "başqa e-poçt" in res.json()["detail"]


async def test_accept_invitation_already_member(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_user = (
            await db.execute(select(User).where(User.email == OWNER_EMAIL))
        ).scalar_one()
        company_id = await _company_id_of(db, owner_user.id)
        _, raw_token = await _create_invitation_directly(
            db,
            company_id,
            ADMIN_EMAIL_T,
            "VIEWER",
            owner_user.id,
        )
        await db.commit()

    token = await login(client, ADMIN_EMAIL_T)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/invitations/accept",
        json={"token": raw_token},
        headers=headers,
    )
    assert res.status_code == 400
    assert "artıq bu şirkətin aktiv üzvüsünüz" in res.json()["detail"]


# ======================================================================
# H. Change role
# ======================================================================

async def test_change_role(client, employer_users):
    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)

    async def _get_db():
        from app.core.database import AsyncSessionLocal
        return AsyncSessionLocal()

    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        admin_mid = await _get_membership_id(db, ADMIN_EMAIL_T)

    res = await client.patch(
        f"/api/v1/employer/team/{admin_mid}/role",
        json={"role": "RECRUITER"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["role"] == "RECRUITER"

    # Reset back to ADMIN for subsequent tests
    async with AsyncSessionLocal() as db:
        membership = await db.get(CompanyMembership, admin_mid)
        membership.role = CompanyMemberRole.ADMIN
        await db.commit()


async def test_change_role_owner_forbidden(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_mid = await _get_membership_id(db, OWNER_EMAIL)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/employer/team/{owner_mid}/role",
        json={"role": "RECRUITER"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Sahibin rolu" in res.json()["detail"]


async def test_change_role_self_forbidden(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        admin_mid = await _get_membership_id(db, ADMIN_EMAIL_T)

    token = await login(client, ADMIN_EMAIL_T)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/employer/team/{admin_mid}/role",
        json={"role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Öz rolunuzu" in res.json()["detail"]


async def test_change_role_forbidden_for_admin_of_other_company(client, employer_users):
    from app.core.database import AsyncSessionLocal

    # Get a membership id from company A
    async with AsyncSessionLocal() as db:
        recruiter_mid = await _get_membership_id(db, RECRUITER_EMAIL)

    # Other company owner tries to change role in company A
    token = await login(client, OTHER_OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.patch(
        f"/api/v1/employer/team/{recruiter_mid}/role",
        json={"role": "VIEWER"},
        headers=headers,
    )
    assert res.status_code == 404
    assert "tapılmadı" in res.json()["detail"]


# ======================================================================
# I. Suspend / Reactivate
# ======================================================================

async def test_suspend_member(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        recruiter_mid = await _get_membership_id(db, RECRUITER_EMAIL)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/employer/team/{recruiter_mid}/suspend",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SUSPENDED"

    # Reset back to ACTIVE for subsequent tests
    async with AsyncSessionLocal() as db:
        membership = await db.get(CompanyMembership, recruiter_mid)
        membership.status = CompanyMembershipStatus.ACTIVE
        await db.commit()


async def test_suspend_owner_forbidden(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_mid = await _get_membership_id(db, OWNER_EMAIL)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/employer/team/{owner_mid}/suspend",
        headers=headers,
    )
    assert res.status_code == 400
    assert "Sahibə tətbiq" in res.json()["detail"]


async def test_reactivate_member(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        viewer_mid = await _get_membership_id(db, VIEWER_EMAIL)
        membership = await db.get(CompanyMembership, viewer_mid)
        membership.status = CompanyMembershipStatus.SUSPENDED
        await db.commit()

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        f"/api/v1/employer/team/{viewer_mid}/reactivate",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ACTIVE"


# ======================================================================
# J. Remove member
# ======================================================================

async def test_remove_member(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        viewer_mid = await _get_membership_id(db, VIEWER_EMAIL)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.delete(
        f"/api/v1/employer/team/{viewer_mid}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SUSPENDED"

    # Reset back to ACTIVE for subsequent tests
    async with AsyncSessionLocal() as db:
        membership = await db.get(CompanyMembership, viewer_mid)
        membership.status = CompanyMembershipStatus.ACTIVE
        await db.commit()


async def test_remove_owner_forbidden(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_mid = await _get_membership_id(db, OWNER_EMAIL)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.delete(
        f"/api/v1/employer/team/{owner_mid}",
        headers=headers,
    )
    assert res.status_code == 400
    assert "Sahib silinə bilməz" in res.json()["detail"]


async def test_remove_last_owner_forbidden(client, employer_users):
    from app.core.database import AsyncSessionLocal

    # Get other company's owner membership id
    async with AsyncSessionLocal() as db:
        other_owner_mid = await _get_membership_id(db, OTHER_OWNER_EMAIL)

    token = await login(client, OTHER_OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.delete(
        f"/api/v1/employer/team/{other_owner_mid}",
        headers=headers,
    )
    assert res.status_code == 400


# ======================================================================
# K. Leave company
# ======================================================================

async def test_leave_company(client, employer_users):
    from app.core.database import AsyncSessionLocal

    # Admin leaves company A
    token = await login(client, ADMIN_EMAIL_T)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/leave",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "SUSPENDED"

    # Reset for subsequent tests
    async with AsyncSessionLocal() as db:
        mid = await _get_membership_id(db, ADMIN_EMAIL_T)
        membership = await db.get(CompanyMembership, mid)
        membership.status = CompanyMembershipStatus.ACTIVE
        await db.commit()


async def test_leave_company_last_owner_forbidden(client, employer_users):
    from app.core.database import AsyncSessionLocal

    # Other company's owner is the only owner — cannot leave
    token = await login(client, OTHER_OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/leave",
        headers=headers,
    )
    assert res.status_code == 400
    assert "Son sahib" in res.json()["detail"]


# ======================================================================
# L. Ownership transfer
# ======================================================================

async def test_transfer_ownership(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        admin_mid = await _get_membership_id(db, ADMIN_EMAIL_T)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/transfer-ownership",
        json={"target_membership_id": str(admin_mid)},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["new_owner"]["role"] == "OWNER"
    assert data["new_owner"]["user_email"] == ADMIN_EMAIL_T
    assert data["previous_owner"]["role"] == "ADMIN"
    assert data["previous_owner"]["user_email"] == OWNER_EMAIL

    # Swap back for subsequent tests
    async with AsyncSessionLocal() as db:
        new_owner = await db.get(CompanyMembership, admin_mid)
        new_owner.role = CompanyMemberRole.ADMIN
        old_owner = await _get_membership_id(db, OWNER_EMAIL)
        old_owner_m = await db.get(CompanyMembership, old_owner)
        old_owner_m.role = CompanyMemberRole.OWNER
        await db.commit()


async def test_transfer_ownership_not_owner(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        viewer_mid = await _get_membership_id(db, VIEWER_EMAIL)

    # Admin has TEAM_MANAGE but is not OWNER
    token = await login(client, ADMIN_EMAIL_T)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/transfer-ownership",
        json={"target_membership_id": str(viewer_mid)},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Yalnız sahib" in res.json()["detail"]


async def test_transfer_ownership_to_self(client, employer_users):
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        owner_mid = await _get_membership_id(db, OWNER_EMAIL)

    token = await login(client, OWNER_EMAIL)
    headers = await csrf_headers(token)
    res = await client.post(
        "/api/v1/employer/team/transfer-ownership",
        json={"target_membership_id": str(owner_mid)},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Özünüzə sahibliyi" in res.json()["detail"]
