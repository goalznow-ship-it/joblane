"""
Admin API router for Joblane.

All endpoints enforce server-side RBAC and CSRF protection.
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
from app.admin.deps import require_permission
from app.admin.roles import Permission, role_permissions
from app.admin import service
from app.core.storage import get_storage_provider, generate_object_name
from app.core.config import settings
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
    CompanyListResponse,
    CompanyDetailOut,
    CompanyCreateRequest,
    CompanyUpdateRequest,
    CompanyStatusRequest,
    FeaturedEmployerRequest,
    UserListResponse,
    UserDetailOut,
    UserStatusRequest,
    RevokeSessionsRequest,
    CategoryListResponse,
    CategoryCreateRequest,
    CategoryUpdateRequest,
    CategoryOut,
    IndustryListResponse,
    IndustryCreateRequest,
    IndustryUpdateRequest,
    IndustryOut,
    RegionListResponse,
    RegionCreateRequest,
    RegionUpdateRequest,
    RegionOut,
    ContentStatusRequest,
    InternshipListResponse,
    InternshipCreateRequest,
    InternshipUpdateRequest,
    InternshipStatusRequest,
    InternshipOut,
    TrainingListResponse,
    TrainingCreateRequest,
    TrainingUpdateRequest,
    TrainingStatusRequest,
    TrainingOut,
    AdvertisementListResponse,
    AdvertisementDetailOut,
    AdvertisementCreateRequest,
    AdvertisementUpdateRequest,
    AdvertisementStatusRequest,
    AdvertisementOut,
    AdvertisementUploadResponse,
    PublicAdsResponse,
    PublicAdOut,
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


# ---------- Companies ----------

@router.get("/companies", response_model=CompanyListResponse)
async def list_companies(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.COMPANIES_VIEW))],
    q: Optional[str] = None,
    status: Optional[str] = None,
    industry_id: Optional[UUID] = None,
    verified_only: Optional[bool] = None,
    featured_only: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> CompanyListResponse:
    items, total = await service.list_companies(
        db,
        q=q,
        status_filter=status,
        industry_id=industry_id,
        verified_only=verified_only,
        featured_only=featured_only,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return CompanyListResponse(
        items=[service.company_to_out(c) for c in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/companies/{company_id}", response_model=CompanyDetailOut)
async def get_company(
    company_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.COMPANIES_VIEW))],
) -> CompanyDetailOut:
    company = await service.get_company_or_404(db, company_id)
    return service.company_detail_out(company)


@router.post("/companies", response_model=CompanyDetailOut, status_code=201)
async def create_company(
    payload: CompanyCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.COMPANIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> CompanyDetailOut:
    company = await service.create_company(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "company.created",
        "company",
        company.id,
        after={"name": company.name, "slug": company.slug, "status": company.status.value},
        request=request,
    )
    await db.flush()
    company = await service.get_company_or_404(db, company.id)
    return service.company_detail_out(company)


@router.patch("/companies/{company_id}", response_model=CompanyDetailOut)
async def update_company(
    company_id: UUID,
    payload: CompanyUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.COMPANIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> CompanyDetailOut:
    company = await service.get_company_or_404(db, company_id)
    before = {"name": company.name, "slug": company.slug, "status": company.status.value}
    company = await service.update_company(db, company, user, payload.model_dump(exclude_unset=True))
    after = {"name": company.name, "slug": company.slug, "status": company.status.value}
    await record_audit(
        db,
        user,
        "company.updated",
        "company",
        company.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    company = await service.get_company_or_404(db, company.id)
    return service.company_detail_out(company)


@router.post("/companies/{company_id}/status", response_model=CompanyDetailOut)
async def change_company_status(
    company_id: UUID,
    payload: CompanyStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.COMPANIES_VERIFY))],
    _: bool = Depends(csrf_protection),
) -> CompanyDetailOut:
    company = await service.get_company_or_404(db, company_id)
    before = {"status": company.status.value}
    company = await service.change_company_status(
        db,
        company,
        user,
        payload.action,
        reason=payload.reason,
        note=payload.note,
    )
    after = {"status": company.status.value}
    action_map = {
        "verify": "company.verified",
        "unverify": "company.unverified",
        "activate": "company.activated",
        "suspend": "company.suspended",
        "reject": "company.rejected",
        "archive": "company.archived",
        "restore": "company.restored",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"company.{payload.action}"),
        "company",
        company.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    company = await service.get_company_or_404(db, company.id)
    return service.company_detail_out(company)


@router.post("/companies/{company_id}/featured-employer", response_model=CompanyDetailOut)
async def toggle_featured_employer(
    company_id: UUID,
    payload: FeaturedEmployerRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.COMPANIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> CompanyDetailOut:
    company = await service.get_company_or_404(db, company_id)
    before = {"featured_until": company.featured_until, "featured_priority": company.featured_priority}
    company = await service.set_featured_employer(
        db,
        company,
        user,
        payload.enabled,
        start_at=payload.start_at,
        end_at=payload.end_at,
        priority=payload.priority,
    )
    after = {"featured_until": company.featured_until, "featured_priority": company.featured_priority}
    await record_audit(
        db,
        user,
        f"company.featured_employer_{'enabled' if payload.enabled else 'disabled'}",
        "company",
        company.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    company = await service.get_company_or_404(db, company.id)
    return service.company_detail_out(company)


# ---------- Users ----------

@router.get("/users", response_model=UserListResponse)
async def list_users(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.USERS_VIEW))],
    q: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    email_verified: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> UserListResponse:
    items, total = await service.list_users(
        db,
        q=q,
        role=role,
        status=status,
        email_verified=email_verified,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return UserListResponse(
        items=[service.user_to_out(u) for u in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/users/{user_id}", response_model=UserDetailOut)
async def get_user(
    user_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.USERS_VIEW))],
) -> UserDetailOut:
    target_user = await service.get_user_or_404(db, user_id)
    return service.user_to_out(target_user)


@router.post("/users/{user_id}/status", response_model=UserDetailOut)
async def change_user_status(
    user_id: UUID,
    payload: UserStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.USERS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> UserDetailOut:
    target_user = await service.get_user_or_404(db, user_id)
    before = {"status": target_user.status.value}
    target_user = await service.change_user_status(db, target_user, user, payload.action, reason=payload.reason)
    after = {"status": target_user.status.value}
    action_map = {
        "suspend": "user.suspended",
        "unsuspend": "user.unsuspended",
        "deactivate": "user.deactivated",
        "reactivate": "user.reactivated",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"user.{payload.action}"),
        "user",
        target_user.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    target_user = await service.get_user_or_404(db, target_user.id)
    return service.user_to_out(target_user)


@router.post("/users/{user_id}/revoke-sessions", response_model=UserDetailOut)
async def revoke_user_sessions(
    user_id: UUID,
    payload: RevokeSessionsRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.USERS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> UserDetailOut:
    target_user = await service.get_user_or_404(db, user_id)
    result = await service.revoke_user_sessions(db, target_user, user, reason=payload.reason)
    await record_audit(
        db,
        user,
        "user.sessions_revoked",
        "user",
        target_user.id,
        after={"revoked_count": result["revoked_count"]},
        request=request,
    )
    await db.flush()
    target_user = await service.get_user_or_404(db, target_user.id)
    return service.user_to_out(target_user)


# ---------- Categories ----------

@router.get("/categories", response_model=CategoryListResponse)
async def list_categories(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.CATEGORIES_MANAGE))],
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "sort_asc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> CategoryListResponse:
    items, total = await service.list_categories(
        db,
        q=q,
        is_active=is_active,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return CategoryListResponse(
        items=[service.category_to_out(c) for c in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: CategoryCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.CATEGORIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> CategoryOut:
    category = await service.create_category(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "category.created",
        "category",
        category.id,
        after={"name": category.name, "slug": category.slug, "is_active": category.is_active},
        request=request,
    )
    await db.flush()
    return service.category_to_out(category)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.CATEGORIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> CategoryOut:
    category = await service.get_category_or_404(db, category_id)
    before = {"name": category.name, "slug": category.slug, "is_active": category.is_active}
    category = await service.update_category(db, category, user, payload.model_dump(exclude_unset=True))
    after = {"name": category.name, "slug": category.slug, "is_active": category.is_active}
    await record_audit(
        db,
        user,
        "category.updated",
        "category",
        category.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.category_to_out(category)


@router.post("/categories/{category_id}/status", response_model=CategoryOut)
async def change_category_status(
    category_id: UUID,
    payload: ContentStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.CATEGORIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> CategoryOut:
    category = await service.get_category_or_404(db, category_id)
    before = {"is_active": category.is_active}
    category = await service.change_category_status(db, category, user, payload.action, reason=payload.reason)
    after = {"is_active": category.is_active}
    action_map = {
        "activate": "category.activated",
        "deactivate": "category.deactivated",
        "archive": "category.archived",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"category.{payload.action}"),
        "category",
        category.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.category_to_out(category)


# ---------- Industries ----------

@router.get("/industries", response_model=IndustryListResponse)
async def list_industries(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INDUSTRIES_MANAGE))],
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "sort_asc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> IndustryListResponse:
    items, total = await service.list_industries(
        db,
        q=q,
        is_active=is_active,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return IndustryListResponse(
        items=[service.industry_to_out(i) for i in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/industries", response_model=IndustryOut, status_code=201)
async def create_industry(
    payload: IndustryCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INDUSTRIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> IndustryOut:
    industry = await service.create_industry(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "industry.created",
        "industry",
        industry.id,
        after={"name": industry.name, "slug": industry.slug, "is_active": industry.is_active},
        request=request,
    )
    await db.flush()
    return service.industry_to_out(industry)


@router.patch("/industries/{industry_id}", response_model=IndustryOut)
async def update_industry(
    industry_id: UUID,
    payload: IndustryUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INDUSTRIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> IndustryOut:
    industry = await service.get_industry_or_404(db, industry_id)
    before = {"name": industry.name, "slug": industry.slug, "is_active": industry.is_active}
    industry = await service.update_industry(db, industry, user, payload.model_dump(exclude_unset=True))
    after = {"name": industry.name, "slug": industry.slug, "is_active": industry.is_active}
    await record_audit(
        db,
        user,
        "industry.updated",
        "industry",
        industry.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.industry_to_out(industry)


@router.post("/industries/{industry_id}/status", response_model=IndustryOut)
async def change_industry_status(
    industry_id: UUID,
    payload: ContentStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INDUSTRIES_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> IndustryOut:
    industry = await service.get_industry_or_404(db, industry_id)
    before = {"is_active": industry.is_active}
    industry = await service.change_industry_status(db, industry, user, payload.action, reason=payload.reason)
    after = {"is_active": industry.is_active}
    action_map = {
        "activate": "industry.activated",
        "deactivate": "industry.deactivated",
        "archive": "industry.archived",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"industry.{payload.action}"),
        "industry",
        industry.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.industry_to_out(industry)


# ---------- Regions ----------

@router.get("/regions", response_model=RegionListResponse)
async def list_regions(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.REGIONS_MANAGE))],
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "sort_asc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> RegionListResponse:
    items, total = await service.list_regions(
        db,
        q=q,
        is_active=is_active,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return RegionListResponse(
        items=[service.region_to_out(r) for r in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/regions", response_model=RegionOut, status_code=201)
async def create_region(
    payload: RegionCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.REGIONS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> RegionOut:
    region = await service.create_region(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "region.created",
        "region",
        region.id,
        after={"name": region.name, "slug": region.slug, "is_active": region.is_active},
        request=request,
    )
    await db.flush()
    return service.region_to_out(region)


@router.patch("/regions/{region_id}", response_model=RegionOut)
async def update_region(
    region_id: UUID,
    payload: RegionUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.REGIONS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> RegionOut:
    region = await service.get_region_or_404(db, region_id)
    before = {"name": region.name, "slug": region.slug, "is_active": region.is_active}
    region = await service.update_region(db, region, user, payload.model_dump(exclude_unset=True))
    after = {"name": region.name, "slug": region.slug, "is_active": region.is_active}
    await record_audit(
        db,
        user,
        "region.updated",
        "region",
        region.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.region_to_out(region)


@router.post("/regions/{region_id}/status", response_model=RegionOut)
async def change_region_status(
    region_id: UUID,
    payload: ContentStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.REGIONS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> RegionOut:
    region = await service.get_region_or_404(db, region_id)
    before = {"is_active": region.is_active}
    region = await service.change_region_status(db, region, user, payload.action, reason=payload.reason)
    after = {"is_active": region.is_active}
    action_map = {
        "activate": "region.activated",
        "deactivate": "region.deactivated",
        "archive": "region.archived",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"region.{payload.action}"),
        "region",
        region.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.region_to_out(region)


# ---------- Internships ----------

@router.get("/internships", response_model=InternshipListResponse)
async def list_internships(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INTERNSHIPS_MANAGE))],
    q: Optional[str] = None,
    status: Optional[str] = None,
    company_id: Optional[UUID] = None,
    region_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> InternshipListResponse:
    items, total = await service.list_internships(
        db,
        q=q,
        status=status,
        company_id=company_id,
        region_id=region_id,
        is_featured=is_featured,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return InternshipListResponse(
        items=[service.internship_to_out(i) for i in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/internships", response_model=InternshipOut, status_code=201)
async def create_internship(
    payload: InternshipCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INTERNSHIPS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> InternshipOut:
    internship = await service.create_internship(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "internship.created",
        "internship",
        internship.id,
        after={"title": internship.title, "slug": internship.slug, "status": internship.status.value},
        request=request,
    )
    await db.flush()
    return service.internship_to_out(internship)


@router.get("/internships/{internship_id}", response_model=InternshipOut)
async def get_internship(
    internship_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INTERNSHIPS_MANAGE))],
) -> InternshipOut:
    internship = await service.get_internship_or_404(db, internship_id)
    return service.internship_to_out(internship)


@router.patch("/internships/{internship_id}", response_model=InternshipOut)
async def update_internship(
    internship_id: UUID,
    payload: InternshipUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INTERNSHIPS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> InternshipOut:
    internship = await service.get_internship_or_404(db, internship_id)
    before = {"title": internship.title, "slug": internship.slug, "status": internship.status.value}
    internship = await service.update_internship(db, internship, user, payload.model_dump(exclude_unset=True))
    after = {"title": internship.title, "slug": internship.slug, "status": internship.status.value}
    await record_audit(
        db,
        user,
        "internship.updated",
        "internship",
        internship.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.internship_to_out(internship)


@router.post("/internships/{internship_id}/status", response_model=InternshipOut)
async def change_internship_status(
    internship_id: UUID,
    payload: InternshipStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.INTERNSHIPS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> InternshipOut:
    internship = await service.get_internship_or_404(db, internship_id)
    before = {"status": internship.status.value}
    internship = await service.change_internship_status(db, internship, user, payload.action, reason=payload.reason, note=payload.note)
    after = {"status": internship.status.value}
    action_map = {
        "approve": "internship.approved",
        "reject": "internship.rejected",
        "publish": "internship.published",
        "unpublish": "internship.unpublished",
        "feature": "internship.featured",
        "archive": "internship.archived",
        "restore": "internship.restored",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"internship.{payload.action}"),
        "internship",
        internship.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.internship_to_out(internship)


# ---------- Trainings ----------

@router.get("/trainings", response_model=TrainingListResponse)
async def list_trainings(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.TRAININGS_MANAGE))],
    q: Optional[str] = None,
    status: Optional[str] = None,
    provider_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> TrainingListResponse:
    items, total = await service.list_trainings(
        db,
        q=q,
        status=status,
        provider_id=provider_id,
        is_featured=is_featured,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return TrainingListResponse(
        items=[service.training_to_out(t) for t in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("/trainings", response_model=TrainingOut, status_code=201)
async def create_training(
    payload: TrainingCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.TRAININGS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> TrainingOut:
    training = await service.create_training(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "training.created",
        "training",
        training.id,
        after={"title": training.title, "slug": training.slug, "status": training.status.value},
        request=request,
    )
    await db.flush()
    return service.training_to_out(training)


@router.get("/trainings/{training_id}", response_model=TrainingOut)
async def get_training(
    training_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.TRAININGS_MANAGE))],
) -> TrainingOut:
    training = await service.get_training_or_404(db, training_id)
    return service.training_to_out(training)


@router.patch("/trainings/{training_id}", response_model=TrainingOut)
async def update_training(
    training_id: UUID,
    payload: TrainingUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.TRAININGS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> TrainingOut:
    training = await service.get_training_or_404(db, training_id)
    before = {"title": training.title, "slug": training.slug, "status": training.status.value}
    training = await service.update_training(db, training, user, payload.model_dump(exclude_unset=True))
    after = {"title": training.title, "slug": training.slug, "status": training.status.value}
    await record_audit(
        db,
        user,
        "training.updated",
        "training",
        training.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.training_to_out(training)


@router.post("/trainings/{training_id}/status", response_model=TrainingOut)
async def change_training_status(
    training_id: UUID,
    payload: TrainingStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.TRAININGS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> TrainingOut:
    training = await service.get_training_or_404(db, training_id)
    before = {"status": training.status.value}
    training = await service.change_training_status(db, training, user, payload.action, reason=payload.reason, note=payload.note)
    after = {"status": training.status.value}
    action_map = {
        "approve": "training.approved",
        "reject": "training.rejected",
        "publish": "training.published",
        "unpublish": "training.unpublished",
        "feature": "training.featured",
        "archive": "training.archived",
        "restore": "training.restored",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"training.{payload.action}"),
        "training",
        training.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    return service.training_to_out(training)


# ---------- Advertisements ----------

@router.get("/ads", response_model=AdvertisementListResponse)
async def list_ads(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.ADS_VIEW))],
    q: Optional[str] = None,
    placement: Optional[str] = None,
    status: Optional[str] = None,
    advertiser: Optional[str] = None,
    sort: str = "created_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> AdvertisementListResponse:
    items, total = await service.list_ads(
        db,
        q=q,
        placement=placement,
        status=status,
        advertiser=advertiser,
        sort=sort,
        page=page,
        limit=limit,
    )
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return AdvertisementListResponse(
        items=[service.ad_to_out(a) for a in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/ads/{ad_id}", response_model=AdvertisementDetailOut)
async def get_ad(
    ad_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.ADS_VIEW))],
) -> AdvertisementDetailOut:
    ad = await service.get_ad_or_404(db, ad_id)
    base = service.ad_to_out(ad)
    data = base.model_dump()
    data["moderation_history"] = [
        {"id": h.id, "from_status": h.from_status, "to_status": h.to_status,
         "actor_email": h.actor_email, "reason": h.reason, "note": h.note, "created_at": h.created_at}
        for h in ad.moderation_history
    ]
    return AdvertisementDetailOut(**data)


@router.post("/ads", response_model=AdvertisementDetailOut, status_code=201)
async def create_ad(
    payload: AdvertisementCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.ADS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> AdvertisementDetailOut:
    ad = await service.create_ad(db, user, payload.model_dump(exclude_unset=True))
    await record_audit(
        db,
        user,
        "ad.created",
        "advertisement",
        ad.id,
        after={"campaign_name": ad.campaign_name, "placement": ad.placement.value, "status": ad.status.value},
        request=request,
    )
    await db.flush()
    ad = await service.get_ad_or_404(db, ad.id)
    base = service.ad_to_out(ad)
    data = base.model_dump()
    data["moderation_history"] = []
    return AdvertisementDetailOut(**data)


@router.patch("/ads/{ad_id}", response_model=AdvertisementDetailOut)
async def update_ad(
    ad_id: UUID,
    payload: AdvertisementUpdateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.ADS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> AdvertisementDetailOut:
    ad = await service.get_ad_or_404(db, ad_id)
    before = {"campaign_name": ad.campaign_name, "placement": ad.placement.value, "status": ad.status.value}
    ad = await service.update_ad(db, ad, user, payload.model_dump(exclude_unset=True))
    after = {"campaign_name": ad.campaign_name, "placement": ad.placement.value, "status": ad.status.value}
    await record_audit(
        db,
        user,
        "ad.updated",
        "advertisement",
        ad.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    ad = await service.get_ad_or_404(db, ad.id)
    base = service.ad_to_out(ad)
    data = base.model_dump()
    data["moderation_history"] = [
        {"id": h.id, "from_status": h.from_status, "to_status": h.to_status,
         "actor_email": h.actor_email, "reason": h.reason, "note": h.note, "created_at": h.created_at}
        for h in ad.moderation_history
    ]
    return AdvertisementDetailOut(**data)


@router.post("/ads/{ad_id}/status", response_model=AdvertisementDetailOut)
async def change_ad_status(
    ad_id: UUID,
    payload: AdvertisementStatusRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.ADS_MANAGE))],
    _: bool = Depends(csrf_protection),
) -> AdvertisementDetailOut:
    ad = await service.get_ad_or_404(db, ad_id)
    before = {"status": ad.status.value}
    ad = await service.change_ad_status(db, ad, user, payload.action, reason=payload.reason)
    after = {"status": ad.status.value}
    action_map = {
        "activate": "ad.activated",
        "pause": "ad.paused",
        "resume": "ad.resumed",
        "archive": "ad.archived",
        "schedule": "ad.scheduled",
    }
    await record_audit(
        db,
        user,
        action_map.get(payload.action, f"ad.{payload.action}"),
        "advertisement",
        ad.id,
        before=before,
        after=after,
        request=request,
    )
    await db.flush()
    ad = await service.get_ad_or_404(db, ad.id)
    base = service.ad_to_out(ad)
    data = base.model_dump()
    data["moderation_history"] = [
        {"id": h.id, "from_status": h.from_status, "to_status": h.to_status,
         "actor_email": h.actor_email, "reason": h.reason, "note": h.note, "created_at": h.created_at}
        for h in ad.moderation_history
    ]
    return AdvertisementDetailOut(**data)


@router.post("/ads/{ad_id}/impressions", response_model=dict)
async def track_impression(
    ad_id: UUID,
    request: Request,
    db: DbDep,
) -> dict:
    ad = await service.get_ad_or_404(db, ad_id)
    await service.increment_impressions(db, ad_id)
    return {"success": True, "impressions": ad.impressions + 1}


@router.post("/ads/{ad_id}/clicks", response_model=dict)
async def track_click(
    ad_id: UUID,
    request: Request,
    db: DbDep,
) -> dict:
    ad = await service.get_ad_or_404(db, ad_id)
    await service.increment_clicks(db, ad_id)
    return {"success": True, "clicks": ad.clicks + 1, "destination_url": ad.destination_url}


# ---------- Public Ads API ----------

@router.get("/public/ads/active", response_model=PublicAdsResponse)
async def get_active_ads(
    db: DbDep,
    placement: str,
    limit: int = 1,
) -> PublicAdsResponse:
    ads = await service.get_active_ads_for_placement(db, placement, limit)
    return PublicAdsResponse(
        items=[
            PublicAdOut(
                id=a.id,
                advertiser_name=a.advertiser_name,
                campaign_name=a.campaign_name,
                headline=a.headline,
                description=a.description,
                cta_label=a.cta_label,
                destination_url=a.destination_url,
                alt_text=a.alt_text,
                format=a.format.value,
                creative_image_url=a.creative_image_url,
                mobile_image_url=a.mobile_image_url,
                background=a.background,
                accent_color=a.accent_color,
            )
            for a in ads
        ]
    )


# ---------- Ad Upload ----------

@router.post("/ads/upload", response_model=AdvertisementUploadResponse)
async def upload_ad_creative(
    db: DbDep,
    user: Annotated[User, Depends(require_permission(Permission.ADS_MANAGE))],
    file: UploadFile = File(...),
    mobile: bool = Query(False),
) -> AdvertisementUploadResponse:
    """Upload advertisement creative (desktop or mobile)."""
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Yalnız PNG, JPEG, WEBP formatları dəstəklənir"
        )
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Fayl ölçüsü 10MB-dan çox ola bilməz"
        )
    
    # Reset file pointer
    file.file.seek(0)
    
    # Generate object name
    prefix = "ads/mobile" if mobile else "ads/desktop"
    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    object_name = await generate_object_name(prefix, ext)
    
    # Upload to storage
    storage = await get_storage_provider()
    bucket = settings.s3_bucket
    await storage.upload(
        bucket_name=bucket,
        object_name=object_name,
        data=io.BytesIO(content),
        content_type=file.content_type,
    )
    
    # Get image dimensions
    width = None
    height = None
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(content))
        width, height = img.size
    except Exception:
        pass
    
    # Generate public URL
    if settings.s3_endpoint and "minio" in settings.s3_endpoint:
        url = f"{settings.s3_endpoint}/{settings.s3_bucket}/{object_name}"
    else:
        url = f"/storage/{object_name}"
    
    return AdvertisementUploadResponse(
        url=url,
        file_size=len(content),
        mime_type=file.content_type,
        width=width,
        height=height,
    )