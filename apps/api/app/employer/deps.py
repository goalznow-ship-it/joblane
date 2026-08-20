"""
FastAPI dependencies for employer authorization.

Resolves the authenticated user's active company membership and enforces
the employer permission matrix. Every employer endpoint is company-scoped:
a user can only ever see or mutate data belonging to companies they are an
active member of.
"""

from dataclasses import dataclass
from typing import Annotated
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.core.database import get_db
from app.admin.models import (
    Company,
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyStatus,
)
from app.employer.permissions import has_employer_permission


class EmployerError(HTTPException):
    def __init__(self, detail: str, code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=code, detail=detail)


@dataclass
class EmployerContext:
    """The authenticated employer and their active company context."""

    user: User
    company: Company
    membership: CompanyMembership


COMPANY_UNAVAILABLE_STATUSES = {
    CompanyStatus.SUSPENDED,
    CompanyStatus.REJECTED,
    CompanyStatus.ARCHIVED,
}


async def get_employer_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require an active, authenticated user (no company required)."""
    if user.status.value != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesab aktiv deyil",
        )
    return user


async def get_company_context(
    request: Request,
    user: Annotated[User, Depends(get_employer_user)],
    db: AsyncSession = Depends(get_db),
) -> EmployerContext:
    """Resolve the user's active company membership.

    A single active membership is used directly. When a user belongs to
    several companies, the X-Company-Id header selects the active one.
    """
    result = await db.execute(
        select(CompanyMembership)
        .options(
            selectinload(CompanyMembership.company).selectinload(Company.memberships),
            selectinload(CompanyMembership.company).selectinload(Company.industry_rel),
        )
        .where(
            CompanyMembership.user_id == user.id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    memberships = list(result.scalars().unique())

    if not memberships:
        raise EmployerError(
            "Şirkət qeydiyyatı tapılmadı. Əvvəlcə şirkət profili yaradın.",
            status.HTTP_403_FORBIDDEN,
        )

    header_id = request.headers.get("X-Company-Id")
    if header_id:
        membership = next(
            (m for m in memberships if str(m.company_id) == header_id), None
        )
        if membership is None:
            raise EmployerError(
                "Bu şirkətə giriş icazəniz yoxdur", status.HTTP_403_FORBIDDEN
            )
    elif len(memberships) == 1:
        membership = memberships[0]
    else:
        raise EmployerError(
            "Bir neçə aktiv şirkətiniz var. X-Company-Id başlığı ilə seçin.",
            status.HTTP_409_CONFLICT,
        )

    company = membership.company
    if company.status in COMPANY_UNAVAILABLE_STATUSES:
        raise EmployerError(
            "Şirkət profili hazırda əlçatan deyil. Dəstək ilə əlaqə saxlayın.",
            status.HTTP_403_FORBIDDEN,
        )
    return EmployerContext(user=user, company=company, membership=membership)


def require_employer_permission(permission: str):
    """
    Dependency factory: require the current employer to hold the given
    permission within their active company context.
    """

    def dependency(
        ctx: Annotated[EmployerContext, Depends(get_company_context)],
    ) -> EmployerContext:
        if not has_employer_permission(ctx.membership.role.value, permission):
            raise EmployerError(
                "Bu əməliyyat üçün icazəniz yoxdur", status.HTTP_403_FORBIDDEN
            )
        return ctx

    return dependency


require_company_write = require_employer_permission
require_company_read = require_employer_permission
require_jobs_read = require_employer_permission
require_jobs_write = require_employer_permission
require_jobs_submit = require_employer_permission
require_jobs_pause = require_employer_permission
require_jobs_archive = require_employer_permission
require_applications_read = require_employer_permission
require_applications_write = require_employer_permission
require_team_manage = require_employer_permission