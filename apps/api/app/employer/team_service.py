"""
Team management business logic for the employer portal.

Handles invitations, membership role changes, suspension, removal,
and ownership transfer. All mutations are company-scoped and audit-logged.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.audit import record_audit
from app.admin.models import (
    Company,
    CompanyMemberRole,
    CompanyMembership,
    CompanyMembershipStatus,
)
from app.auth.models import User
from app.email.service import enqueue_email
from app.employer.deps import EmployerError
from app.employer.models import CompanyInvitation, InvitationStatus
from app.notifications.models import NotificationType
from app.notifications.service import create_notification

logger = logging.getLogger(__name__)

INVITATION_TTL_DAYS = 7

COMPANY_INVITABLE_ROLES = {
    CompanyMemberRole.ADMIN,
    CompanyMemberRole.RECRUITER,
    CompanyMemberRole.VIEWER,
}


def utcnow():
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_invite_token() -> str:
    return secrets.token_urlsafe(64)


# ── helpers ────────────────────────────────────────────────────────────


def _membership_to_dict(m: CompanyMembership) -> dict:
    user = m.user
    return {
        "id": m.id,
        "company_id": m.company_id,
        "user_id": m.user_id,
        "role": m.role.value,
        "status": m.status.value,
        "user_email": user.email if user else None,
        "user_full_name": user.full_name if user else None,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


def _invitation_to_dict(inv: CompanyInvitation) -> dict:
    return {
        "id": inv.id,
        "company_id": inv.company_id,
        "email": inv.email,
        "role": inv.role,
        "status": inv.status.value,
        "invited_by": inv.invited_by,
        "expires_at": inv.expires_at,
        "accepted_by": inv.accepted_by,
        "accepted_at": inv.accepted_at,
        "revoked_by": inv.revoked_by,
        "revoked_at": inv.revoked_at,
        "created_at": inv.created_at,
    }


async def _load_company(db: AsyncSession, company_id: UUID) -> Company:
    company = await db.get(Company, company_id)
    if not company:
        raise EmployerError("Şirkət tapılmadı", 404)
    return company


async def _load_membership(
    db: AsyncSession, membership_id: UUID, company_id: UUID
) -> CompanyMembership:
    result = await db.execute(
        select(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .where(
            CompanyMembership.id == membership_id,
            CompanyMembership.company_id == company_id,
        )
    )
    m = result.scalar_one_or_none()
    if not m:
        raise EmployerError("Üzv tapılmadı", 404)
    return m


async def _load_invitation(
    db: AsyncSession, invitation_id: UUID, company_id: UUID
) -> CompanyInvitation:
    result = await db.execute(
        select(CompanyInvitation).where(
            CompanyInvitation.id == invitation_id,
            CompanyInvitation.company_id == company_id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise EmployerError("Dəvət tapılmadı", 404)
    return inv


async def _load_invitation_by_token(
    db: AsyncSession, token: str
) -> CompanyInvitation:
    token_hash = hash_token(token)
    result = await db.execute(
        select(CompanyInvitation)
        .options(selectinload(CompanyInvitation.company))
        .where(CompanyInvitation.token_hash == token_hash)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise EmployerError("Dəvət tapılmadı", 404)
    return inv


async def _count_role_members(
    db: AsyncSession, company_id: UUID, role: CompanyMemberRole
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(CompanyMembership)
        .where(
            CompanyMembership.company_id == company_id,
            CompanyMembership.role == role,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    return result.scalar() or 0


async def _is_last_owner(db: AsyncSession, company_id: UUID) -> bool:
    count = await _count_role_members(db, company_id, CompanyMemberRole.OWNER)
    return count <= 1


def _validate_role(role_str: str) -> CompanyMemberRole:
    try:
        role = CompanyMemberRole(role_str)
    except ValueError:
        raise EmployerError(f"Bilinməyən rol: {role_str}")
    if role not in COMPANY_INVITABLE_ROLES:
        raise EmployerError(
            "Yalnız ADMIN, RECRUITER və ya VIEWER roluna dəvət etmək olar"
        )
    return role


# ── list ───────────────────────────────────────────────────────────────


async def list_team_members(db: AsyncSession, company_id: UUID) -> list[dict]:
    result = await db.execute(
        select(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .where(
            CompanyMembership.company_id == company_id,
            CompanyMembership.status.in_([
                CompanyMembershipStatus.ACTIVE,
                CompanyMembershipStatus.SUSPENDED,
            ]),
        )
        .order_by(CompanyMembership.created_at.asc())
    )
    memberships = list(result.scalars().unique())
    return [_membership_to_dict(m) for m in memberships]


async def list_invitations(
    db: AsyncSession,
    company_id: UUID,
    status_filter: Optional[str] = None,
) -> list[dict]:
    stmt = select(CompanyInvitation).where(
        CompanyInvitation.company_id == company_id,
    )
    if status_filter:
        try:
            inv_status = InvitationStatus(status_filter)
        except ValueError:
            raise EmployerError(f"Bilinməyən status: {status_filter}")
        stmt = stmt.where(CompanyInvitation.status == inv_status)
    stmt = stmt.order_by(CompanyInvitation.created_at.desc())
    result = await db.execute(stmt)
    invitations = list(result.scalars().all())
    return [_invitation_to_dict(i) for i in invitations]


# ── invitation CRUD ────────────────────────────────────────────────────


async def create_invitation(
    db: AsyncSession,
    company_id: UUID,
    email: str,
    role: str,
    invited_by: User,
    request: Optional[Request] = None,
) -> dict:
    target_role = _validate_role(role)
    email_normalized = email.strip().lower()

    target_user_result = await db.execute(
        select(User).where(User.email_normalized == email_normalized)
    )
    target_user = target_user_result.scalar_one_or_none()

    if target_user:
        already_member = await db.execute(
            select(CompanyMembership.id).where(
                CompanyMembership.company_id == company_id,
                CompanyMembership.user_id == target_user.id,
                CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
            )
        )
        if already_member.scalar_one_or_none():
            raise EmployerError(
                "Bu istifadəçi artıq şirkətin aktiv üzvüdür"
            )

    old_pending = await db.execute(
        select(CompanyInvitation).where(
            CompanyInvitation.company_id == company_id,
            CompanyInvitation.email_normalized == email_normalized,
            CompanyInvitation.status == InvitationStatus.PENDING,
        )
    )
    for old_inv in old_pending.scalars().all():
        old_inv.status = InvitationStatus.REVOKED
        old_inv.revoked_by = invited_by.id
        old_inv.revoked_at = utcnow()
        old_inv.updated_at = utcnow()

    token = generate_invite_token()
    token_hashed = hash_token(token)
    expires_at = utcnow() + timedelta(days=INVITATION_TTL_DAYS)

    invitation = CompanyInvitation(
        company_id=company_id,
        email=email,
        email_normalized=email_normalized,
        role=target_role.value,
        status=InvitationStatus.PENDING,
        invited_by=invited_by.id,
        token_hash=token_hashed,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()

    await record_audit(
        db,
        actor=invited_by,
        action="employer.team.invitation_created",
        entity_type="company_invitation",
        entity_id=invitation.id,
        after={
            "email": email,
            "role": target_role.value,
            "expires_at": expires_at.isoformat(),
        },
        request=request,
    )
    await db.flush()

    company = await _load_company(db, company_id)
    try:
        await enqueue_email(
            db,
            recipient=email,
            template="team_invitation",
            subject=f"Sizi {company.name} komandasına dəvət edirlər",
            context={
                "token": token,
                "company_name": company.name,
                "role": target_role.value,
                "invited_by_name": invited_by.full_name or invited_by.email,
                "expires_at": expires_at.strftime("%d.%m.%Y"),
            },
        )
    except Exception:
        logger.exception("Failed to enqueue team invitation email")

    if target_user:
        await create_notification(
            db,
            user_id=target_user.id,
            type=NotificationType.TEAM_INVITATION,
            title="Yeni komanda dəvəti",
            message=(
                f"{company.name} şirkətinə {target_role.value} rolunda "
                "dəvət aldınız."
            ),
            entity_type="company_invitation",
            entity_id=invitation.id,
        )

    return _invitation_to_dict(invitation)


async def resend_invitation(
    db: AsyncSession,
    invitation_id: UUID,
    company_id: UUID,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    invitation = await _load_invitation(db, invitation_id, company_id)
    if invitation.status != InvitationStatus.PENDING:
        raise EmployerError(
            "Yalnız aktiv dəvətləri yenidən göndərmək olar"
        )

    old_before = {
        "token_hash": invitation.token_hash,
        "expires_at": invitation.expires_at.isoformat(),
    }

    token = generate_invite_token()
    invitation.token_hash = hash_token(token)
    invitation.expires_at = utcnow() + timedelta(days=INVITATION_TTL_DAYS)
    invitation.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.invitation_resent",
        entity_type="company_invitation",
        entity_id=invitation.id,
        before=old_before,
        after={"expires_at": invitation.expires_at.isoformat()},
        request=request,
    )
    await db.flush()

    company = await _load_company(db, company_id)
    try:
        await enqueue_email(
            db,
            recipient=invitation.email,
            template="team_invitation",
            subject=f"Sizi {company.name} komandasına dəvət edirlər",
            context={
                "token": token,
                "company_name": company.name,
                "role": invitation.role,
                "invited_by_name": actor.full_name or actor.email,
                "expires_at": invitation.expires_at.strftime("%d.%m.%Y"),
            },
        )
    except Exception:
        logger.exception("Failed to enqueue resent invitation email")

    return _invitation_to_dict(invitation)


async def revoke_invitation(
    db: AsyncSession,
    invitation_id: UUID,
    company_id: UUID,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    invitation = await _load_invitation(db, invitation_id, company_id)
    if invitation.status != InvitationStatus.PENDING:
        raise EmployerError(
            "Dəvət artıq ləğv edilib və ya qəbul olunub"
        )

    before = {"status": invitation.status.value}
    invitation.status = InvitationStatus.REVOKED
    invitation.revoked_by = actor.id
    invitation.revoked_at = utcnow()
    invitation.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.invitation_revoked",
        entity_type="company_invitation",
        entity_id=invitation.id,
        before=before,
        after={"status": InvitationStatus.REVOKED.value},
        request=request,
    )
    await db.flush()
    return _invitation_to_dict(invitation)


# ── preview / accept ───────────────────────────────────────────────────


async def preview_invitation(db: AsyncSession, token: str) -> dict:
    invitation = await _load_invitation_by_token(db, token)

    if invitation.status != InvitationStatus.PENDING:
        raise EmployerError("Bu dəvət artıq etibarsızdır")

    if invitation.expires_at < utcnow():
        invitation.status = InvitationStatus.EXPIRED
        invitation.updated_at = utcnow()
        await db.flush()
        raise EmployerError("Bu dəvətin müddəti bitib")

    company = await _load_company(db, invitation.company_id)

    return {
        "email": invitation.email,
        "role": invitation.role,
        "company_name": company.name,
        "company_logo_url": company.logo_url,
        "expires_at": invitation.expires_at.isoformat(),
        "status": invitation.status.value,
    }


async def accept_invitation(
    db: AsyncSession,
    token: str,
    user: User,
    request: Optional[Request] = None,
) -> dict:
    invitation = await _load_invitation_by_token(db, token)

    if invitation.status != InvitationStatus.PENDING:
        raise EmployerError("Bu dəvət artıq etibarsızdır")

    if invitation.expires_at < utcnow():
        invitation.status = InvitationStatus.EXPIRED
        invitation.updated_at = utcnow()
        await db.flush()
        raise EmployerError("Bu dəvətin müddəti bitib")

    if user.email_normalized != invitation.email_normalized:
        raise EmployerError(
            "Bu dəvət başqa e-poçt ünvanı üçün nəzərdə tutulub"
        )

    existing = await db.execute(
        select(CompanyMembership.id).where(
            CompanyMembership.company_id == invitation.company_id,
            CompanyMembership.user_id == user.id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    if existing.scalar_one_or_none():
        raise EmployerError(
            "Siz artıq bu şirkətin aktiv üzvüsünüz"
        )

    old_membership = await db.execute(
        select(CompanyMembership).where(
            CompanyMembership.company_id == invitation.company_id,
            CompanyMembership.user_id == user.id,
            CompanyMembership.status == CompanyMembershipStatus.SUSPENDED,
        )
    )
    old_m = old_membership.scalar_one_or_none()
    if old_m:
        old_m.status = CompanyMembershipStatus.ACTIVE
        old_m.role = CompanyMemberRole(invitation.role)
        old_m.updated_at = utcnow()
        membership = old_m
    else:
        membership = CompanyMembership(
            company_id=invitation.company_id,
            user_id=user.id,
            role=CompanyMemberRole(invitation.role),
            status=CompanyMembershipStatus.ACTIVE,
        )
        db.add(membership)

    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_by = user.id
    invitation.accepted_at = utcnow()
    invitation.updated_at = utcnow()
    await db.flush()

    company = await _load_company(db, invitation.company_id)

    await record_audit(
        db,
        actor=user,
        action="employer.team.invitation_accepted",
        entity_type="company_invitation",
        entity_id=invitation.id,
        before={"status": InvitationStatus.PENDING.value},
        after={
            "status": InvitationStatus.ACCEPTED.value,
            "accepted_by": str(user.id),
        },
        request=request,
    )
    await db.flush()

    await create_notification(
        db,
        user_id=invitation.invited_by,
        type=NotificationType.TEAM_INVITATION_ACCEPTED,
        title="Dəvət qəbul edildi",
        message=(
            f"{user.full_name or user.email} {company.name} "
            "komandasına qoşuldu."
        ),
        entity_type="company_membership",
        entity_id=membership.id,
    )

    return _membership_to_dict(membership)


# ── membership mutations ───────────────────────────────────────────────


async def change_member_role(
    db: AsyncSession,
    membership_id: UUID,
    company_id: UUID,
    new_role: str,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    target_role = _validate_role(new_role)
    membership = await _load_membership(db, membership_id, company_id)

    if membership.role == CompanyMemberRole.OWNER:
        raise EmployerError("Sahibin rolu dəyişdirilə bilməz")

    if membership.user_id == actor.id:
        raise EmployerError("Öz rolunuzu dəyişdirə bilməzsiniz")

    before = {"role": membership.role.value}
    old_role = membership.role
    membership.role = target_role
    membership.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.role_changed",
        entity_type="company_membership",
        entity_id=membership.id,
        before=before,
        after={"role": target_role.value},
        request=request,
    )
    await db.flush()

    company = await _load_company(db, company_id)
    await create_notification(
        db,
        user_id=membership.user_id,
        type=NotificationType.TEAM_ROLE_CHANGED,
        title="Rolunuz dəyişdirildi",
        message=(
            f"{company.name} şirkətində rolunuz "
            f"{old_role.value}-dan {target_role.value}-a dəyişdirildi."
        ),
        entity_type="company_membership",
        entity_id=membership.id,
    )

    return _membership_to_dict(membership)


async def suspend_member(
    db: AsyncSession,
    membership_id: UUID,
    company_id: UUID,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    membership = await _load_membership(db, membership_id, company_id)

    if membership.role == CompanyMemberRole.OWNER:
        raise EmployerError("Sahibə tətbiq edilə bilməz")

    if membership.user_id == actor.id:
        raise EmployerError("Özünüzü tətbiq edə bilməzsiniz")

    if membership.status != CompanyMembershipStatus.ACTIVE:
        raise EmployerError("Üzv artıq aktiv deyil")

    before = {"status": membership.status.value}
    membership.status = CompanyMembershipStatus.SUSPENDED
    membership.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.member_suspended",
        entity_type="company_membership",
        entity_id=membership.id,
        before=before,
        after={"status": CompanyMembershipStatus.SUSPENDED.value},
        request=request,
    )
    await db.flush()
    return _membership_to_dict(membership)


async def reactivate_member(
    db: AsyncSession,
    membership_id: UUID,
    company_id: UUID,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    membership = await _load_membership(db, membership_id, company_id)

    if membership.status != CompanyMembershipStatus.SUSPENDED:
        raise EmployerError("Üzv aktiv vəziyyətdədir")

    before = {"status": membership.status.value}
    membership.status = CompanyMembershipStatus.ACTIVE
    membership.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.member_reactivated",
        entity_type="company_membership",
        entity_id=membership.id,
        before=before,
        after={"status": CompanyMembershipStatus.ACTIVE.value},
        request=request,
    )
    await db.flush()
    return _membership_to_dict(membership)


async def remove_member(
    db: AsyncSession,
    membership_id: UUID,
    company_id: UUID,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    membership = await _load_membership(db, membership_id, company_id)

    if membership.role == CompanyMemberRole.OWNER:
        raise EmployerError("Sahib silinə bilməz")

    if membership.user_id == actor.id:
        raise EmployerError("Özünüzü silə bilməzsiniz")

    before = {
        "status": membership.status.value,
        "role": membership.role.value,
    }
    membership.status = CompanyMembershipStatus.SUSPENDED
    membership.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.member_removed",
        entity_type="company_membership",
        entity_id=membership.id,
        before=before,
        after={"status": CompanyMembershipStatus.SUSPENDED.value},
        request=request,
    )
    await db.flush()

    company = await _load_company(db, company_id)
    await create_notification(
        db,
        user_id=membership.user_id,
        type=NotificationType.TEAM_MEMBER_REMOVED,
        title="Komandadan çıxarıldınız",
        message=f"{company.name} komandasından çıxarıldınız.",
        entity_type="company_membership",
        entity_id=membership.id,
    )

    return _membership_to_dict(membership)


async def leave_company(
    db: AsyncSession,
    user: User,
    company_id: UUID,
    request: Optional[Request] = None,
) -> dict:
    result = await db.execute(
        select(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .where(
            CompanyMembership.company_id == company_id,
            CompanyMembership.user_id == user.id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise EmployerError("Aktiv üzvlük tapılmadı")

    if membership.role == CompanyMemberRole.OWNER:
        if await _is_last_owner(db, company_id):
            raise EmployerError(
                "Son sahib şirkəti tərk edə bilməz. Əvvəlcə sahibliyi başqasına köçürün."
            )

    before = {
        "status": membership.status.value,
        "role": membership.role.value,
    }
    membership.status = CompanyMembershipStatus.SUSPENDED
    membership.updated_at = utcnow()

    await record_audit(
        db,
        actor=user,
        action="employer.team.member_left",
        entity_type="company_membership",
        entity_id=membership.id,
        before=before,
        after={"status": CompanyMembershipStatus.SUSPENDED.value},
        request=request,
    )
    await db.flush()

    company = await _load_company(db, company_id)
    owners = await db.execute(
        select(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .where(
            CompanyMembership.company_id == company_id,
            CompanyMembership.role == CompanyMemberRole.OWNER,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    for owner in owners.scalars().all():
        if owner.user_id != user.id:
            await create_notification(
                db,
                user_id=owner.user_id,
                type=NotificationType.TEAM_MEMBER_REMOVED,
                title="Üzv şirkəti tərk etdi",
                message=(
                    f"{user.full_name or user.email} {company.name} "
                    "şirkətini tərk etdi."
                ),
                entity_type="company_membership",
                entity_id=membership.id,
            )

    return _membership_to_dict(membership)


async def transfer_ownership(
    db: AsyncSession,
    target_membership_id: UUID,
    company_id: UUID,
    actor: User,
    request: Optional[Request] = None,
) -> dict:
    current_result = await db.execute(
        select(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .where(
            CompanyMembership.company_id == company_id,
            CompanyMembership.user_id == actor.id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    current_membership = current_result.scalar_one_or_none()
    if not current_membership:
        raise EmployerError("Aktiv üzvlük tapılmadı")

    if current_membership.role != CompanyMemberRole.OWNER:
        raise EmployerError("Yalnız sahib sahibliyi köçürə bilər")

    target = await _load_membership(db, target_membership_id, company_id)

    if target.user_id == actor.id:
        raise EmployerError("Özünüzə sahibliyi köçürə bilməzsiniz")

    if target.status != CompanyMembershipStatus.ACTIVE:
        raise EmployerError(
            "Yalnız aktiv üzvə sahiblik köçürülə bilər"
        )

    current_before = {"role": current_membership.role.value}
    target_before = {"role": target.role.value}

    current_membership.role = CompanyMemberRole.ADMIN
    current_membership.updated_at = utcnow()
    target.role = CompanyMemberRole.OWNER
    target.updated_at = utcnow()

    await record_audit(
        db,
        actor=actor,
        action="employer.team.ownership_transferred",
        entity_type="company_membership",
        entity_id=target.id,
        before={
            "current_user_role": current_before["role"],
            "target_user_role": target_before["role"],
        },
        after={
            "current_user_role": CompanyMemberRole.ADMIN.value,
            "target_user_role": CompanyMemberRole.OWNER.value,
        },
        request=request,
    )
    await db.flush()

    company = await _load_company(db, company_id)
    await create_notification(
        db,
        user_id=actor.id,
        type=NotificationType.OWNERSHIP_TRANSFERRED,
        title="Sahiblik köçürüldü",
        message=(
            f"{company.name} şirkətinin sahibliyi "
            f"{target.user.full_name or target.user.email}-a köçürüldü."
        ),
        entity_type="company_membership",
        entity_id=target.id,
    )
    await create_notification(
        db,
        user_id=target.user_id,
        type=NotificationType.OWNERSHIP_RECEIVED,
        title="Siz yeni sahib oldunuz",
        message=(
            f"{company.name} şirkətinin yeni sahibi təyin edildiniz."
        ),
        entity_type="company_membership",
        entity_id=target.id,
    )

    return {
        "previous_owner": _membership_to_dict(current_membership),
        "new_owner": _membership_to_dict(target),
    }
