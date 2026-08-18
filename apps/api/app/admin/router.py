"""
Admin API router for Joblane.

All endpoints enforce server-side RBAC and CSRF protection.
Every mutation records an audit entry in the same transaction.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import csrf_protection
from app.auth.models import User
from app.admin.deps import require_permission
from app.admin.roles import Permission, role_permissions
from app.admin import service
from app.admin.schemas import (
    AdminMeResponse,
    DashboardResponse,
    JobListResponse,
    JobDetailOut,
    ModerationRequest,
    JobStatusRequest,
    PremiumRequest,
    FeaturedRequest,
    UrgentRequest,
    JobUpdateRequest,
)
from app.admin.audit import record_audit

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/me", response_model=AdminMeResponse)
async def admin_me(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.DASHBOARD_VIEW))],
) -> AdminMeResponse:
    return AdminMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        permissions=sorted(role_permissions(user.role)),
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.DASHBOARD_VIEW))],
) -> DashboardResponse:
    return await service.build_dashboard(db, user)


# ---------- Jobs ----------

@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_VIEW))],
    q: Optional[str] = None,
    status: Optional[str] = None,
    company_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    region_id: Optional[UUID] = None,
    industry: Optional[str] = None,
    work_mode: Optional[str] = None,
    employment_type: Optional[str] = None,
    premium: Optional[bool] = None,
    featured: Optional[bool] = None,
    urgent: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> JobListResponse:
    items, total = await service.list_jobs(
        db,
        q=q,
        status_filter=status,
        company_id=company_id,
        category_id=category_id,
        region_id=region_id,
        industry=industry,
        work_mode=work_mode,
        employment_type=employment_type,
        premium=premium,
        featured=featured,
        urgent=urgent,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return JobListResponse(
        items=[service.job_to_out(j) for j in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/jobs/{job_id}", response_model=JobDetailOut)
async def get_job(
    job_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_VIEW))],
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    return service.job_detail_out(job)


@router.post("/jobs/{job_id}/moderation", response_model=JobDetailOut)
async def moderate(
    job_id: UUID,
    payload: ModerationRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_MODERATE))],
    _: bool = Depends(csrf_protection),
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    before = {"status": job.status.value}
    job = await service.moderate_job(
        db,
        job,
        user,
        payload.decision,
        reason=payload.reason,
        note=payload.note,
    )
    after = {"status": job.status.value, "moderation_reason": job.moderation_reason}
    await record_audit(
        db,
        user,
        f"job.{'approved' if payload.decision == 'approve' else 'rejected'}",
        "job",
        job.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    job = await service.get_job_or_404(db, job.id)
    return service.job_detail_out(job)


@router.post("/jobs/{job_id}/status", response_model=JobDetailOut)
async def change_status(
    job_id: UUID,
    payload: JobStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_PUBLISH))],
    _: bool = Depends(csrf_protection),
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    before = {"status": job.status.value}
    job = await service.change_job_status(db, job, user, payload.action, note=payload.note)
    after = {"status": job.status.value}
    await record_audit(
        db,
        user,
        f"job.{payload.action}",
        "job",
        job.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    job = await service.get_job_or_404(db, job.id)
    return service.job_detail_out(job)


@router.post("/jobs/{job_id}/premium", response_model=JobDetailOut)
async def toggle_premium(
    job_id: UUID,
    payload: PremiumRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_PROMOTE))],
    _: bool = Depends(csrf_protection),
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    before = {"is_premium": job.is_premium, "premium_until": job.premium_until}
    job = await service.set_premium(
        db,
        job,
        user,
        payload.enabled,
        start_at=payload.start_at,
        end_at=payload.end_at,
        boost_priority=payload.boost_priority,
    )
    after = {"is_premium": job.is_premium, "premium_until": job.premium_until}
    await record_audit(
        db,
        user,
        f"job.premium_{'enabled' if payload.enabled else 'disabled'}",
        "job",
        job.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    job = await service.get_job_or_404(db, job.id)
    return service.job_detail_out(job)


@router.post("/jobs/{job_id}/featured", response_model=JobDetailOut)
async def toggle_featured(
    job_id: UUID,
    payload: FeaturedRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_PROMOTE))],
    _: bool = Depends(csrf_protection),
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    before = {"is_featured": job.is_featured, "featured_until": job.featured_until}
    job = await service.set_featured(
        db,
        job,
        user,
        payload.enabled,
        start_at=payload.start_at,
        end_at=payload.end_at,
    )
    after = {"is_featured": job.is_featured, "featured_until": job.featured_until}
    await record_audit(
        db,
        user,
        f"job.featured_{'enabled' if payload.enabled else 'disabled'}",
        "job",
        job.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    job = await service.get_job_or_404(db, job.id)
    return service.job_detail_out(job)


@router.post("/jobs/{job_id}/urgent", response_model=JobDetailOut)
async def toggle_urgent(
    job_id: UUID,
    payload: UrgentRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_PROMOTE))],
    _: bool = Depends(csrf_protection),
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    before = {"is_urgent": job.is_urgent, "urgent_until": job.urgent_until}
    job = await service.set_urgent(db, job, user, payload.enabled, end_at=payload.end_at)
    after = {"is_urgent": job.is_urgent, "urgent_until": job.urgent_until}
    await record_audit(
        db,
        user,
        f"job.urgent_{'enabled' if payload.enabled else 'disabled'}",
        "job",
        job.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    job = await service.get_job_or_404(db, job.id)
    return service.job_detail_out(job)


@router.patch("/jobs/{job_id}", response_model=JobDetailOut)
async def update_job(
    job_id: UUID,
    payload: JobUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_EDIT))],
    _: bool = Depends(csrf_protection),
) -> JobDetailOut:
    job = await service.get_job_or_404(db, job_id)
    before = {"title": job.title, "salary_min": str(job.salary_min) if job.salary_min is not None else None}
    job = await service.update_job(db, job, user, payload.model_dump(exclude_unset=True))
    after = {"title": job.title}
    await record_audit(
        db,
        user,
        "job.updated",
        "job",
        job.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    job = await service.get_job_or_404(db, job.id)
    return service.job_detail_out(job)


@router.delete("/jobs/{job_id}", status_code=200)
async def delete_job(
    job_id: UUID,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.JOBS_DELETE))],
    _: bool = Depends(csrf_protection),
) -> dict:
    job = await service.get_job_or_404(db, job_id)
    await record_audit(
        db,
        user,
        "job.deleted",
        "job",
        job.id,
        before={"title": job.title, "status": job.status.value},
        request=request,
    )
    await service.delete_job(db, job, user)
    await db.flush()
    return {"success": True}
