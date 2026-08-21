"""
Employer team management API router.

Endpoints under /api/v1/employer/team handle team membership and
invitation operations. Public endpoints under
/api/v1/employer/invitations allow unauthenticated invitation preview
and authenticated acceptance.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.core.database import get_db
from app.employer.deps import (
    EmployerContext,
    EmployerError,
    get_company_context,
    require_employer_permission,
)
from app.employer.permissions import EmployerPermission
from app.employer import team_service

# ── authenticated team router ──────────────────────────────────────────

router = APIRouter(prefix="/api/v1/employer/team", tags=["employer-team"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ── request / response schemas ─────────────────────────────────────────


class TeamMemberOut(BaseModel):
    id: UUID
    company_id: UUID
    user_id: UUID
    role: str
    status: str
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None


class InvitationOut(BaseModel):
    id: UUID
    company_id: UUID
    email: str
    role: str
    status: str
    invited_by: UUID
    expires_at: Optional[str] = None
    accepted_by: Optional[UUID] = None
    accepted_at: Optional[str] = None
    revoked_by: Optional[UUID] = None
    revoked_at: Optional[str] = None
    created_at: Optional[str] = None


class InvitationCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    role: str = Field(..., pattern="^(ADMIN|RECRUITER|VIEWER)$")


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(ADMIN|RECRUITER|VIEWER)$")


class OwnershipTransferRequest(BaseModel):
    target_membership_id: UUID


class TeamListResponse(BaseModel):
    items: list[dict]
    total: int


class InvitationListResponse(BaseModel):
    items: list[dict]
    total: int


# ── endpoints ──────────────────────────────────────────────────────────


@router.get("/")
async def list_team_members(
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
):
    members = await team_service.list_team_members(db, ctx.company.id)
    return TeamListResponse(items=members, total=len(members))


@router.get("/invitations")
async def list_invitations(
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    status: Optional[str] = Query(None, alias="status"),
):
    invitations = await team_service.list_invitations(
        db, ctx.company.id, status_filter=status
    )
    return InvitationListResponse(items=invitations, total=len(invitations))


@router.post(
    "/invitations",
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    data: InvitationCreateRequest,
):
    result = await team_service.create_invitation(
        db,
        company_id=ctx.company.id,
        email=data.email,
        role=data.role,
        invited_by=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    invitation_id: UUID,
):
    result = await team_service.resend_invitation(
        db,
        invitation_id=invitation_id,
        company_id=ctx.company.id,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_200_OK)
async def revoke_invitation(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    invitation_id: UUID,
):
    result = await team_service.revoke_invitation(
        db,
        invitation_id=invitation_id,
        company_id=ctx.company.id,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.patch("/{membership_id}/role")
async def change_member_role(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    membership_id: UUID,
    data: RoleUpdateRequest,
):
    result = await team_service.change_member_role(
        db,
        membership_id=membership_id,
        company_id=ctx.company.id,
        new_role=data.role,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.post("/{membership_id}/suspend")
async def suspend_member(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    membership_id: UUID,
):
    result = await team_service.suspend_member(
        db,
        membership_id=membership_id,
        company_id=ctx.company.id,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.post("/{membership_id}/reactivate")
async def reactivate_member(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    membership_id: UUID,
):
    result = await team_service.reactivate_member(
        db,
        membership_id=membership_id,
        company_id=ctx.company.id,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.delete("/{membership_id}", status_code=status.HTTP_200_OK)
async def remove_member(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    membership_id: UUID,
):
    result = await team_service.remove_member(
        db,
        membership_id=membership_id,
        company_id=ctx.company.id,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


@router.post("/leave")
async def leave_company(
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(get_company_context)],
):
    result = await team_service.leave_company(
        db,
        user=user,
        company_id=ctx.company.id,
        request=request,
    )
    await db.commit()
    return result


@router.post("/transfer-ownership")
async def transfer_ownership(
    request: Request,
    ctx: Annotated[
        EmployerContext,
        Depends(require_employer_permission(EmployerPermission.TEAM_MANAGE)),
    ],
    db: DbDep,
    data: OwnershipTransferRequest,
):
    result = await team_service.transfer_ownership(
        db,
        target_membership_id=data.target_membership_id,
        company_id=ctx.company.id,
        actor=ctx.user,
        request=request,
    )
    await db.commit()
    return result


# ── public invitation router (no auth) ────────────────────────────────

public_router = APIRouter(
    prefix="/api/v1/employer/invitations", tags=["invitations-public"]
)


@public_router.get("/preview")
async def preview_invitation(
    db: DbDep,
    token: str = Query(...),
):
    return await team_service.preview_invitation(db, token)


class AcceptInvitationRequest(BaseModel):
    token: str


@public_router.post("/accept", status_code=status.HTTP_200_OK)
async def accept_invitation(
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: DbDep,
    data: AcceptInvitationRequest,
):
    result = await team_service.accept_invitation(
        db, token=data.token, user=user, request=request
    )
    await db.commit()
    return result
