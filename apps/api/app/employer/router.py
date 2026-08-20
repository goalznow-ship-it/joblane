"""
Employer portal API router.

Endpoints live under /api/v1/employer, are protected by session + CSRF
authentication and are scoped to the caller's active company membership.
Every mutation records an audit entry in the same transaction.
"""

from typing import Annotated, Optional
from uuid import UUID
import io

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import csrf_protection
from app.auth.models import User
from app.admin.models import Company
from app.core.storage import get_storage_provider, generate_object_name
from app.core.config import settings
from app.employer.deps import (
    EmployerContext,
    EmployerError,
    get_company_context,
    get_employer_user,
    require_employer_permission,
)
from app.employer.permissions import EmployerPermission as P
from app.employer import service
from app.employer.schemas import (
    ApplicationListResponse,
    ApplicationOut,
    ApplicationStatusUpdateRequest,
    CompanyCreateRequest,
    CompanyOut,
    CompanyUpdateRequest,
    DashboardResponse,
    EmployerJobDetailOut,
    EmployerJobOut,
    EmployerMeResponse,
    JobCreateRequest,
    JobListResponse,
    JobStatusActionRequest,
    JobUpdateRequest,
    UploadResponse,
)

router = APIRouter(prefix="/api/v1/employer", tags=["employer"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------- Me / onboarding ----------

@router.get("/me", response_model=EmployerMeResponse)
async def employer_me(
    db: DbDep,
    user: Annotated[User, Depends(get_employer_user)],
) -> EmployerMeResponse:
    memberships = await service.list_memberships(db, user.id)
    active = next((m for m in memberships if m.status == "ACTIVE"), None)
    current_company = None
    if active:
        company = await db.get(Company, active.company_id)
        if company:
            current_company = await service.company_to_out(db, company)
    return EmployerMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        email_verified=user.email_verified_at is not None,
        status=user.status.value,
        memberships=memberships,
        current_company=current_company,
    )


# ---------- Company ----------

@router.post("/company", response_model=CompanyOut, status_code=201)
async def create_company(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_employer_user)],
    data: CompanyCreateRequest,
    _: bool = Depends(csrf_protection),
) -> CompanyOut:
    company = await service.create_company(db, user, data, request)
    await db.commit()
    return await service.company_to_out(db, company)


@router.get("/company", response_model=CompanyOut)
async def get_company(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.COMPANY_READ))],
) -> CompanyOut:
    return await service.company_to_out(db, ctx.company)


@router.patch("/company", response_model=CompanyOut)
async def update_company(
    request: Request,
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.COMPANY_WRITE))],
    data: CompanyUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> CompanyOut:
    company = await service.update_company(db, ctx, data, request)
    await db.commit()
    return await service.company_to_out(db, company)


@router.post("/company/logo", response_model=UploadResponse)
async def upload_company_logo(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.COMPANY_WRITE))],
    file: UploadFile = File(...),
    _: bool = Depends(csrf_protection),
) -> UploadResponse:
    url = await _upload_company_image(ctx, file, "logo")
    company = ctx.company
    company.logo_url = url
    await db.commit()
    return UploadResponse(url=url)


@router.post("/company/cover", response_model=UploadResponse)
async def upload_company_cover(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.COMPANY_WRITE))],
    file: UploadFile = File(...),
    _: bool = Depends(csrf_protection),
) -> UploadResponse:
    url = await _upload_company_image(ctx, file, "cover")
    company = ctx.company
    company.cover_url = url
    await db.commit()
    return UploadResponse(url=url)


async def _upload_company_image(
    ctx: EmployerContext, file: UploadFile, kind: str
) -> str:
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Yalnız PNG, JPEG, WEBP formatları dəstəklənir",
        )

    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Fayl ölçüsü 10MB-dan çox ola bilməz",
        )
    file.file.seek(0)

    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    object_name = await generate_object_name(f"companies/{ctx.company.id}/{kind}", ext)

    storage = await get_storage_provider()
    await storage.upload(
        bucket_name=settings.s3_bucket,
        object_name=object_name,
        data=io.BytesIO(content),
        content_type=file.content_type,
    )

    if settings.s3_endpoint and "minio" in settings.s3_endpoint:
        return f"{settings.s3_endpoint}/{settings.s3_bucket}/{object_name}"
    return f"/storage/{settings.s3_bucket}/{object_name}"


# ---------- Dashboard ----------

@router.get("/dashboard", response_model=DashboardResponse)
async def employer_dashboard(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.COMPANY_READ))],
) -> DashboardResponse:
    return await service.dashboard(db, ctx)


# ---------- Jobs ----------

@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.JOBS_READ))],
    q: Optional[str] = None,
    status: Optional[str] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> JobListResponse:
    items, total = await service.list_jobs(db, ctx, q=q, status_filter=status, sort=sort, page=page, limit=limit)
    return JobListResponse(items=items, total=total, page=page, limit=limit)


@router.post("/jobs", response_model=EmployerJobDetailOut, status_code=201)
async def create_job(
    request: Request,
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.JOBS_WRITE))],
    data: JobCreateRequest,
    _: bool = Depends(csrf_protection),
) -> EmployerJobDetailOut:
    job = await service.create_job(db, ctx, data, request)
    await db.commit()
    job = await service.get_job_or_404(db, ctx, job.id)
    return service._job_detail_out(job)


@router.get("/jobs/{job_id}", response_model=EmployerJobDetailOut)
async def get_job(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.JOBS_READ))],
    job_id: UUID,
) -> EmployerJobDetailOut:
    job = await service.get_job_or_404(db, ctx, job_id)
    return service._job_detail_out(job)


@router.patch("/jobs/{job_id}", response_model=EmployerJobDetailOut)
async def update_job(
    request: Request,
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.JOBS_WRITE))],
    job_id: UUID,
    data: JobUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> EmployerJobDetailOut:
    job = await service.get_job_or_404(db, ctx, job_id)
    job = await service.update_job(db, ctx, job, data, request)
    await db.commit()
    return service._job_detail_out(job)


@router.post("/jobs/{job_id}/status", response_model=EmployerJobDetailOut)
async def change_job_status(
    request: Request,
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.JOBS_SUBMIT))],
    job_id: UUID,
    data: JobStatusActionRequest,
    _: bool = Depends(csrf_protection),
) -> EmployerJobDetailOut:
    job = await service.get_job_or_404(db, ctx, job_id)
    if data.action == "submit":
        job = await service.submit_job(db, ctx, job, request)
    elif data.action == "pause":
        job = await service.pause_job(db, ctx, job, request)
    elif data.action == "archive":
        job = await service.archive_job(db, ctx, job, request)
    else:
        raise EmployerError("Bilinməyən əməliyyat")
    await db.commit()
    return service._job_detail_out(job)


# ---------- Applications ----------

@router.get("/applications", response_model=ApplicationListResponse)
async def list_applications(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.APPLICATIONS_READ))],
    job_id: Optional[UUID] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "applied_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> ApplicationListResponse:
    items, total = await service.list_applications(
        db, ctx, job_id=job_id, status_filter=status, q=q, sort=sort, page=page, limit=limit
    )
    return ApplicationListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/applications/{application_id}", response_model=ApplicationOut)
async def get_application(
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.APPLICATIONS_READ))],
    application_id: UUID,
) -> ApplicationOut:
    app = await service.get_application_or_404(db, ctx, application_id)
    return service._application_to_out(app)


@router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
async def update_application_status(
    request: Request,
    db: DbDep,
    ctx: Annotated[EmployerContext, Depends(require_employer_permission(P.APPLICATIONS_WRITE))],
    application_id: UUID,
    data: ApplicationStatusUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> ApplicationOut:
    app = await service.get_application_or_404(db, ctx, application_id)
    app = await service.update_application_status(db, ctx, app, data.status, request)
    await db.commit()
    return service._application_to_out(app)