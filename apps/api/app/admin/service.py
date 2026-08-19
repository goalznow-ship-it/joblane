"""
Business logic for the Joblane admin API.

All mutations persist to the database and record audit entries
(in the same transaction). Nothing here is frontend-local state.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.models import (
    Job,
    JobStatus,
    JobModerationHistory,
    Company,
    JobCategory,
    Region,
    Industry,
    Advertisement,
    AuditLog,
    Promotion,
    PromotionType,
    PromotionStatus,
    CompanyStatus,
    CompanyModerationHistory,
    Internship,
    Training,
    ContentStatus,
    InternshipModerationHistory,
    TrainingModerationHistory,
)
from app.admin.schemas import (
    JobOut,
    JobDetailOut,
    ModerationHistoryOut,
    DashboardResponse,
    CompanyOut,
    CompanyDetailOut,
    CompanyListResponse,
    UserOut,
    UserDetailOut,
    CategoryOut,
    CategoryListResponse,
    IndustryOut,
    IndustryListResponse,
    RegionOut,
    RegionListResponse,
    InternshipOut,
    InternshipListResponse,
    TrainingOut,
    TrainingListResponse,
    AdvertisementOut,
    AdvertisementListResponse,
    AdvertisementDetailOut,
    AdvertisementUploadResponse,
    PublicAdsResponse,
    PublicAdOut,
)
from app.auth.models import User, UserStatus
from app.core.database import get_db

DEFAULT_VACANCY_DURATION_DAYS = 30

MODERATION_TRANSITIONS: dict[JobStatus, set[JobStatus]] = {
    JobStatus.DRAFT: {JobStatus.PENDING_REVIEW, JobStatus.APPROVED, JobStatus.REJECTED, JobStatus.PUBLISHED},
    JobStatus.PENDING_REVIEW: {JobStatus.APPROVED, JobStatus.REJECTED},
    JobStatus.APPROVED: {JobStatus.PUBLISHED, JobStatus.REJECTED, JobStatus.ARCHIVED},
    JobStatus.REJECTED: {JobStatus.DRAFT, JobStatus.PUBLISHED, JobStatus.ARCHIVED},
    JobStatus.PUBLISHED: {JobStatus.PAUSED, JobStatus.ARCHIVED, JobStatus.REJECTED},
    JobStatus.PAUSED: {JobStatus.PUBLISHED, JobStatus.ARCHIVED, JobStatus.REJECTED},
    JobStatus.EXPIRED: {JobStatus.PUBLISHED, JobStatus.ARCHIVED},
    JobStatus.ARCHIVED: {JobStatus.DRAFT},
}


class AdminError(HTTPException):
    def __init__(self, detail: str, code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=code, detail=detail)


# ---------- Job serialization ----------

def job_to_out(job: Job) -> JobOut:
    return JobOut(
        id=job.id,
        company_id=job.company_id,
        title=job.title,
        slug=job.slug,
        description=job.description,
        requirements=job.requirements,
        responsibilities=job.responsibilities,
        benefits=job.benefits,
        salary_min=float(job.salary_min) if job.salary_min is not None else None,
        salary_max=float(job.salary_max) if job.salary_max is not None else None,
        salary_currency=job.salary_currency,
        salary_period=job.salary_period,
        salary_visible=job.salary_visible,
        location=job.location,
        region_id=job.region_id,
        category_id=job.category_id,
        industry=job.industry,
        employment_type=job.employment_type.value if job.employment_type else None,
        work_mode=job.work_mode.value if job.work_mode else None,
        experience_level=job.experience_level,
        education=job.education,
        application_deadline=job.application_deadline,
        publication_date=job.publication_date,
        expiration_date=job.expiration_date,
        status=job.status.value,
        moderation_reason=job.moderation_reason,
        moderation_note=job.moderation_note,
        admin_note=job.admin_note,
        is_premium=job.is_premium,
        premium_since=job.premium_since,
        premium_until=job.premium_until,
        is_featured=job.is_featured,
        featured_since=job.featured_since,
        featured_until=job.featured_until,
        is_urgent=job.is_urgent,
        urgent_until=job.urgent_until,
        boost_priority=job.boost_priority,
        views=job.views,
        applications_count=job.applications_count,
        favorites_count=job.favorites_count,
        created_at=job.created_at,
        updated_at=job.updated_at,
        company_name=job.company.name if job.company else None,
        category_name=job.category.name if job.category else None,
        region_name=job.region.name if job.region else None,
    )


async def get_job_or_404(db: AsyncSession, job_id: UUID) -> Job:
    result = await db.execute(
        select(Job)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Job.company),
            selectinload(Job.category),
            selectinload(Job.region),
            selectinload(Job.moderation_history),
        )
        .where(Job.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise AdminError("Vakansiya tapılmadı", status.HTTP_404_NOT_FOUND)
    return job


async def list_jobs(
    db: AsyncSession,
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
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
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Job], int]:
    stmt = (
        select(Job)
        .options(
            selectinload(Job.company),
            selectinload(Job.category),
            selectinload(Job.region),
        )
        .join(Company, Job.company_id == Company.id)
    )
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Job.title.ilike(pattern), Company.name.ilike(pattern)))
    if status_filter:
        try:
            conditions.append(Job.status == JobStatus(status_filter))
        except ValueError:
            raise AdminError(f"Bilinməyən status: {status_filter}")
    if company_id:
        conditions.append(Job.company_id == company_id)
    if category_id:
        conditions.append(Job.category_id == category_id)
    if region_id:
        conditions.append(Job.region_id == region_id)
    if industry:
        conditions.append(Job.industry == industry)
    if work_mode:
        try:
            from app.admin.models import WorkMode
            conditions.append(Job.work_mode == WorkMode(work_mode))
        except ValueError:
            raise AdminError(f"Bilinməyən iş rejimi: {work_mode}")
    if employment_type:
        try:
            from app.admin.models import EmploymentType
            conditions.append(Job.employment_type == EmploymentType(employment_type))
        except ValueError:
            raise AdminError(f"Bilinməyən məşğulluq növü: {employment_type}")
    if premium is not None:
        conditions.append(Job.is_premium == premium)
    if featured is not None:
        conditions.append(Job.is_featured == featured)
    if urgent is not None:
        conditions.append(Job.is_urgent == urgent)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Job.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "created_desc": Job.created_at.desc(),
        "created_asc": Job.created_at.asc(),
        "published_desc": Job.publication_date.desc().nullslast(),
        "views_desc": Job.views.desc(),
        "title_asc": Job.title.asc(),
        "expiry_asc": Job.expiration_date.asc().nullslast(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def job_detail_out(job: Job) -> JobDetailOut:
    base = job_to_out(job)
    data = base.model_dump()
    data["moderation_history"] = [
        ModerationHistoryOut.model_validate(h).model_dump() for h in job.moderation_history
    ]
    return JobDetailOut(**data)


# ---------- Moderation ----------

async def _add_history(
    db: AsyncSession,
    job: Job,
    actor: User,
    to_status: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> JobModerationHistory:
    entry = JobModerationHistory(
        job_id=job.id,
        from_status=job.status.value if job.status else None,
        to_status=to_status,
        actor_id=actor.id,
        actor_email=actor.email,
        reason=reason,
        note=note,
    )
    db.add(entry)
    return entry


async def moderate_job(
    db: AsyncSession,
    job: Job,
    actor: User,
    decision: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> Job:
    if decision == "approve":
        if job.status not in (JobStatus.DRAFT, JobStatus.PENDING_REVIEW):
            raise AdminError("Yalnız DRAFT və ya PENDING_REVIEW vakansiya təsdiqlənə bilər")
        await _add_history(db, job, actor, JobStatus.APPROVED.value, None, note)
        job.status = JobStatus.APPROVED
        job.moderation_reason = None
        job.moderation_note = note
    elif decision == "reject":
        if job.status in (JobStatus.PUBLISHED, JobStatus.PAUSED, JobStatus.EXPIRED):
            raise AdminError("Yayımlanmış vakansiya rədd edilə bilməz — əvvəlcə arxivləyin")
        if not reason or not reason.strip():
            raise AdminError("Rədd etmək üçün səbəb tələb olunur")
        await _add_history(db, job, actor, JobStatus.REJECTED.value, reason, note)
        job.status = JobStatus.REJECTED
        job.moderation_reason = reason.strip()
        job.moderation_note = note
    else:
        raise AdminError("Yanlış qərar")
    return job


async def change_job_status(
    db: AsyncSession,
    job: Job,
    actor: User,
    action: str,
    note: Optional[str] = None,
) -> Job:
    now = datetime.now(timezone.utc)
    transitions = {
        "publish": (JobStatus.PUBLISHED, {JobStatus.DRAFT, JobStatus.APPROVED, JobStatus.PAUSED, JobStatus.REJECTED, JobStatus.EXPIRED}),
        "unpublish": (JobStatus.PAUSED, {JobStatus.PUBLISHED}),
        "pause": (JobStatus.PAUSED, {JobStatus.PUBLISHED, JobStatus.APPROVED}),
        "archive": (JobStatus.ARCHIVED, set(JobStatus) - {JobStatus.ARCHIVED}),
        "restore": (JobStatus.DRAFT, {JobStatus.ARCHIVED, JobStatus.REJECTED, JobStatus.PAUSED}),
    }
    if action not in transitions:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")

    target, allowed_from = transitions[action]
    if job.status not in allowed_from:
        raise AdminError(f"'{job.status.value}' vəziyyətindən '{target.value}' vəziyyətinə keçid mümkün deyil")

    await _add_history(db, job, actor, target.value, None, note)
    job.status = target
    if action == "publish":
        job.publication_date = job.publication_date or now
        if not job.expiration_date or job.expiration_date <= now:
            job.expiration_date = (job.publication_date or now) + timedelta(days=DEFAULT_VACANCY_DURATION_DAYS)
    if action == "restore":
        job.moderation_reason = None
    return job


async def set_premium(
    db: AsyncSession,
    job: Job,
    actor: User,
    enabled: bool,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    boost_priority: Optional[int] = None,
) -> Job:
    now = datetime.now(timezone.utc)
    if enabled:
        start = start_at or now
        if end_at and end_at <= start:
            raise AdminError("Premium bitmə tarixi başlama tarixindən sonra olmalıdır")
        job.is_premium = True
        job.premium_since = start
        job.premium_until = end_at
        if boost_priority is not None:
            job.boost_priority = boost_priority
        _sync_promotion(db, job, PromotionType.PREMIUM, start, end_at, actor)
    else:
        job.is_premium = False
        job.premium_since = None
        job.premium_until = None
        if boost_priority is not None:
            job.boost_priority = 0
        _cancel_promotions(db, job, PromotionType.PREMIUM)
    return job


async def set_featured(
    db: AsyncSession,
    job: Job,
    actor: User,
    enabled: bool,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
) -> Job:
    now = datetime.now(timezone.utc)
    if enabled:
        start = start_at or now
        if end_at and end_at <= start:
            raise AdminError("Featured bitmə tarixi başlama tarixindən sonra olmalıdır")
        job.is_featured = True
        job.featured_since = start
        job.featured_until = end_at
        _sync_promotion(db, job, PromotionType.FEATURED, start, end_at, actor)
    else:
        job.is_featured = False
        job.featured_since = None
        job.featured_until = None
        _cancel_promotions(db, job, PromotionType.FEATURED)
    return job


async def set_urgent(
    db: AsyncSession,
    job: Job,
    actor: User,
    enabled: bool,
    end_at: Optional[datetime] = None,
) -> Job:
    now = datetime.now(timezone.utc)
    if enabled:
        if end_at and end_at <= now:
            raise AdminError("Urgent bitmə tarixi indidən sonra olmalıdır")
        job.is_urgent = True
        job.urgent_until = end_at or (now + timedelta(days=7))
        _sync_promotion(db, job, PromotionType.URGENT, now, job.urgent_until, actor)
    else:
        job.is_urgent = False
        job.urgent_until = None
        _cancel_promotions(db, job, PromotionType.URGENT)
    return job


def _sync_promotion(
    db: AsyncSession,
    job: Job,
    promo_type: PromotionType,
    start_at: datetime,
    end_at: Optional[datetime],
    actor: User,
) -> None:
    now = datetime.now(timezone.utc)
    promo = Promotion(
        entity_type="job",
        entity_id=job.id,
        promotion_type=promo_type,
        start_at=start_at,
        end_at=end_at,
        status=PromotionStatus.ACTIVE if start_at <= now else PromotionStatus.SCHEDULED,
        created_by=actor.id,
    )
    db.add(promo)


def _cancel_promotions(db: AsyncSession, job: Job, promo_type: PromotionType) -> None:
    from sqlalchemy import update

    db.add(
        Promotion(
            entity_type="job",
            entity_id=job.id,
            promotion_type=promo_type,
            status=PromotionStatus.CANCELLED,
        )
    )


async def update_job(db: AsyncSession, job: Job, actor: User, data: dict) -> Job:
    from app.admin.models import EmploymentType, WorkMode

    allowed = {
        "title",
        "description",
        "requirements",
        "responsibilities",
        "benefits",
        "salary_min",
        "salary_max",
        "salary_currency",
        "salary_visible",
        "location",
        "employment_type",
        "work_mode",
        "experience_level",
        "application_deadline",
        "admin_note",
    }
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "employment_type" and value:
            try:
                value = EmploymentType(value)
            except ValueError:
                raise AdminError(f"Bilinməyən məşğulluq növü: {value}")
        if key == "work_mode" and value:
            try:
                value = WorkMode(value)
            except ValueError:
                raise AdminError(f"Bilinməyən iş rejimi: {value}")
        setattr(job, key, value)
    return job


async def delete_job(db: AsyncSession, job: Job, actor: User) -> None:
    await db.delete(job)


# ---------- Company serialization ----------

def company_to_out(company: Company) -> CompanyOut:
    return CompanyOut(
        id=company.id,
        name=company.name,
        slug=company.slug,
        description=company.description,
        website=company.website,
        email=company.email,
        phone=company.phone,
        address=company.address,
        socials=company.socials,
        industry=company.industry,
        industry_id=company.industry_id,
        industry_name=company.industry_rel.name if company.industry_rel else None,
        logo_url=company.logo_url,
        cover_url=company.cover_url,
        status=company.status.value,
        verified_at=company.verified_at,
        verified_by=company.verified_by,
        verification_notes=company.verification_notes,
        featured_until=company.featured_until,
        featured_priority=company.featured_priority,
        created_at=company.created_at,
        updated_at=company.updated_at,
    )


async def get_company_or_404(db: AsyncSession, company_id: UUID) -> Company:
    result = await db.execute(
        select(Company)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Company.industry_rel),
            selectinload(Company.jobs),
        )
        .where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise AdminError("Şirkət tapılmadı", status.HTTP_404_NOT_FOUND)
    return company


async def list_companies(
    db: AsyncSession,
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    industry_id: Optional[UUID] = None,
    verified_only: Optional[bool] = None,
    featured_only: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Company], int]:
    stmt = select(Company).options(selectinload(Company.industry_rel))
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Company.name.ilike(pattern), Company.slug.ilike(pattern)))
    if status_filter:
        try:
            conditions.append(Company.status == CompanyStatus(status_filter))
        except ValueError:
            raise AdminError(f"Bilinməyən şirkət statusu: {status_filter}")
    if industry_id:
        conditions.append(Company.industry_id == industry_id)
    if verified_only:
        conditions.append(Company.status.in_([CompanyStatus.VERIFIED, CompanyStatus.ACTIVE]))
    if featured_only:
        now = datetime.now(timezone.utc)
        conditions.append(and_(
            Company.featured_until.is_not(None),
            Company.featured_until >= now,
            Company.status.in_([CompanyStatus.VERIFIED, CompanyStatus.ACTIVE])
        ))

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Count total
    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Company.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    order_map = {
        "created_desc": Company.created_at.desc(),
        "created_asc": Company.created_at.asc(),
        "name_asc": Company.name.asc(),
        "name_desc": Company.name.desc(),
        "verified_desc": Company.verified_at.desc().nullslast(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


async def create_company(db: AsyncSession, actor: User, data: dict) -> Company:
    from app.admin.models import CompanyStatus

    # Check slug uniqueness
    existing = await db.execute(select(Company).where(Company.slug == data["slug"]))
    if existing.scalar_one_or_none():
        raise AdminError("Bu slug artıq istifadə olunub")

    company = Company(
        name=data["name"],
        slug=data["slug"],
        description=data.get("description"),
        website=data.get("website"),
        email=data.get("email"),
        phone=data.get("phone"),
        address=data.get("address"),
        socials=data.get("socials", {}),
        industry_id=data.get("industry_id"),
        logo_url=data.get("logo_url"),
        cover_url=data.get("cover_url"),
        status=CompanyStatus(data.get("status", "PENDING")),
    )
    db.add(company)
    return company


async def update_company(db: AsyncSession, company: Company, actor: User, data: dict) -> Company:
    allowed = {
        "name", "slug", "description", "website", "email", "phone",
        "address", "socials", "industry_id", "logo_url", "cover_url",
        "featured_until", "featured_priority",
    }
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "slug":
            existing = await db.execute(
                select(Company).where(and_(Company.slug == value, Company.id != company.id))
            )
            if existing.scalar_one_or_none():
                raise AdminError("Bu slug artıq istifadə olunub")
        setattr(company, key, value)
    return company


async def _add_company_history(
    db: AsyncSession,
    company: Company,
    actor: User,
    to_status: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> CompanyModerationHistory:
    entry = CompanyModerationHistory(
        company_id=company.id,
        from_status=company.status.value if company.status else None,
        to_status=to_status,
        actor_id=actor.id,
        actor_email=actor.email,
        reason=reason,
        note=note,
    )
    db.add(entry)
    return entry


async def change_company_status(
    db: AsyncSession,
    company: Company,
    actor: User,
    action: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> Company:
    now = datetime.now(timezone.utc)
    transitions = {
        "verify": (CompanyStatus.VERIFIED, {CompanyStatus.PENDING}),
        "unverify": (CompanyStatus.PENDING, {CompanyStatus.VERIFIED, CompanyStatus.ACTIVE}),
        "activate": (CompanyStatus.ACTIVE, {CompanyStatus.VERIFIED, CompanyStatus.SUSPENDED}),
        "suspend": (CompanyStatus.SUSPENDED, {CompanyStatus.ACTIVE, CompanyStatus.VERIFIED}),
        "reject": (CompanyStatus.REJECTED, set(CompanyStatus) - {CompanyStatus.REJECTED}),
        "archive": (CompanyStatus.ARCHIVED, set(CompanyStatus) - {CompanyStatus.ARCHIVED}),
        "restore": (CompanyStatus.PENDING, {CompanyStatus.ARCHIVED, CompanyStatus.REJECTED, CompanyStatus.SUSPENDED}),
    }

    if action not in transitions:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")

    target, allowed_from = transitions[action]
    if company.status not in allowed_from:
        raise AdminError(f"'{company.status.value}' vəziyyətindən '{target.value}' vəziyyətinə keçid mümkün deyil")

    await _add_company_history(db, company, actor, target.value, reason, note)

    company.status = target
    if action == "verify":
        company.verified_at = now
        company.verified_by = actor.id
        company.verification_notes = note
    elif action == "unverify":
        company.verified_at = None
        company.verified_by = None
        company.verification_notes = None
    elif action == "reject":
        company.verification_notes = reason

    return company


async def set_featured_employer(
    db: AsyncSession,
    company: Company,
    actor: User,
    enabled: bool,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    priority: Optional[int] = None,
) -> Company:
    now = datetime.now(timezone.utc)
    if enabled:
        start = start_at or now
        if end_at and end_at <= start:
            raise AdminError("Featured employer bitmə tarixi başlama tarixindən sonra olmalıdır")
        company.featured_until = end_at
        if priority is not None:
            company.featured_priority = priority
        _sync_promotion(db, company, PromotionType.FEATURED_EMPLOYER, start, end_at, actor)
    else:
        company.featured_until = None
        company.featured_priority = 0
        _cancel_promotions(db, company, PromotionType.FEATURED_EMPLOYER)
    return company


def company_detail_out(company: Company) -> CompanyDetailOut:
    base = company_to_out(company)
    data = base.model_dump()
    # Load moderation history if available
    data["moderation_history"] = []
    return CompanyDetailOut(**data)


# ---------- Users ----------

async def get_user_or_404(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(
        select(User)
        .execution_options(populate_existing=True)
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise AdminError("İstifadəçi tapılmadı", status.HTTP_404_NOT_FOUND)
    return user


async def list_users(
    db: AsyncSession,
    q: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    email_verified: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[User], int]:
    from app.auth.models import UserStatus

    stmt = select(User)
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(User.email.ilike(pattern), User.full_name.ilike(pattern)))
    if role:
        conditions.append(User.role == role)
    if status:
        try:
            conditions.append(User.status == UserStatus(status))
        except ValueError:
            raise AdminError(f"Bilinməyən istifadəçi statusu: {status}")
    if email_verified is not None:
        if email_verified:
            conditions.append(User.email_verified_at.is_not(None))
        else:
            conditions.append(User.email_verified_at.is_(None))

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(User.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "created_desc": User.created_at.desc(),
        "created_asc": User.created_at.asc(),
        "email_asc": User.email.asc(),
        "last_login_desc": User.last_login_at.desc().nullslast(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        email_normalized=user.email_normalized,
        full_name=user.full_name,
        role=user.role,
        status=user.status.value,
        email_verified_at=user.email_verified_at,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def change_user_status(
    db: AsyncSession,
    user: User,
    actor: User,
    action: str,
    reason: Optional[str] = None,
) -> User:
    from app.auth.models import UserStatus

    now = datetime.now(timezone.utc)
    transitions = {
        "suspend": (UserStatus.SUSPENDED, {UserStatus.ACTIVE}),
        "unsuspend": (UserStatus.ACTIVE, {UserStatus.SUSPENDED}),
        "deactivate": (UserStatus.DELETED, {UserStatus.ACTIVE, UserStatus.SUSPENDED}),
        "reactivate": (UserStatus.ACTIVE, {UserStatus.DELETED}),
    }

    if action not in transitions:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")

    target, allowed_from = transitions[action]
    if user.status not in allowed_from:
        raise AdminError(f"'{user.status.value}' vəziyyətindən '{target.value}' vəziyyətinə keçid mümkün deyil")

    user.status = target
    return user


async def revoke_user_sessions(
    db: AsyncSession,
    user: User,
    actor: User,
    reason: Optional[str] = None,
) -> dict:
    from app.auth.models import UserSession

    now = datetime.now(timezone.utc)
    # Mark all active sessions as revoked
    result = await db.execute(
        select(UserSession).where(
            and_(
                UserSession.user_id == user.id,
                UserSession.expires_at > now,
            )
        )
    )
    sessions = result.scalars().all()
    revoked_count = 0
    for session in sessions:
        session.revoked = True
        revoked_count += 1

    return {"revoked_count": revoked_count}


# ---------- Categories ----------

async def get_category_or_404(db: AsyncSession, category_id: UUID) -> JobCategory:
    result = await db.execute(
        select(JobCategory)
        .execution_options(populate_existing=True)
        .where(JobCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise AdminError("Kateqoriya tapılmadı", status.HTTP_404_NOT_FOUND)
    return category


async def list_categories(
    db: AsyncSession,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "sort_asc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[JobCategory], int]:
    stmt = select(JobCategory)
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(JobCategory.name.ilike(pattern), JobCategory.slug.ilike(pattern)))
    if is_active is not None:
        conditions.append(JobCategory.is_active == is_active)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(JobCategory.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "sort_asc": JobCategory.sort_order.asc(),
        "sort_desc": JobCategory.sort_order.desc(),
        "name_asc": JobCategory.name.asc(),
        "created_desc": JobCategory.created_at.desc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["sort_asc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def category_to_out(category: JobCategory) -> CategoryOut:
    return CategoryOut(
        id=category.id,
        name=category.name,
        slug=category.slug,
        icon=category.icon,
        description=category.description,
        seo_title=category.seo_title,
        seo_description=category.seo_description,
        sort_order=category.sort_order,
        is_active=category.is_active,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


async def create_category(db: AsyncSession, actor: User, data: dict) -> JobCategory:
    existing = await db.execute(select(JobCategory).where(JobCategory.slug == data["slug"]))
    if existing.scalar_one_or_none():
        raise AdminError("Bu slug artıq istifadə olunub")

    category = JobCategory(
        name=data["name"],
        slug=data["slug"],
        icon=data.get("icon"),
        description=data.get("description"),
        seo_title=data.get("seo_title"),
        seo_description=data.get("seo_description"),
        sort_order=data.get("sort_order", 0),
        is_active=data.get("is_active", True),
    )
    db.add(category)
    return category


async def update_category(db: AsyncSession, category: JobCategory, actor: User, data: dict) -> JobCategory:
    allowed = {"name", "slug", "icon", "description", "seo_title", "seo_description", "sort_order", "is_active"}
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "slug":
            existing = await db.execute(
                select(JobCategory).where(and_(JobCategory.slug == value, JobCategory.id != category.id))
            )
            if existing.scalar_one_or_none():
                raise AdminError("Bu slug artıq istifadə olunub")
        setattr(category, key, value)
    return category


async def change_category_status(
    db: AsyncSession,
    category: JobCategory,
    actor: User,
    action: str,
    reason: Optional[str] = None,
) -> JobCategory:
    from app.admin.models import JobCategory
    if action == "activate":
        if category.is_active:
            raise AdminError("Kateqoriya artıq aktivdir")
        category.is_active = True
    elif action == "deactivate":
        if not category.is_active:
            raise AdminError("Kateqoriya artıq deaktivdir")
        category.is_active = False
    elif action == "archive":
        category.is_active = False
    else:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")
    return category


# ---------- Industries ----------

async def get_industry_or_404(db: AsyncSession, industry_id: UUID) -> Industry:
    result = await db.execute(
        select(Industry)
        .execution_options(populate_existing=True)
        .where(Industry.id == industry_id)
    )
    industry = result.scalar_one_or_none()
    if not industry:
        raise AdminError("Sənaye tapılmadı", status.HTTP_404_NOT_FOUND)
    return industry


async def list_industries(
    db: AsyncSession,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "sort_asc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Industry], int]:
    stmt = select(Industry)
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Industry.name.ilike(pattern), Industry.slug.ilike(pattern)))
    if is_active is not None:
        conditions.append(Industry.is_active == is_active)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Industry.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "sort_asc": Industry.sort_order.asc(),
        "sort_desc": Industry.sort_order.desc(),
        "name_asc": Industry.name.asc(),
        "created_desc": Industry.created_at.desc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["sort_asc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def industry_to_out(industry: Industry) -> IndustryOut:
    return IndustryOut(
        id=industry.id,
        name=industry.name,
        slug=industry.slug,
        description=industry.description,
        seo_title=industry.seo_title,
        seo_description=industry.seo_description,
        sort_order=industry.sort_order,
        is_active=industry.is_active,
        created_at=industry.created_at,
        updated_at=industry.updated_at,
    )


async def create_industry(db: AsyncSession, actor: User, data: dict) -> Industry:
    existing = await db.execute(select(Industry).where(Industry.slug == data["slug"]))
    if existing.scalar_one_or_none():
        raise AdminError("Bu slug artıq istifadə olunub")

    industry = Industry(
        name=data["name"],
        slug=data["slug"],
        description=data.get("description"),
        seo_title=data.get("seo_title"),
        seo_description=data.get("seo_description"),
        sort_order=data.get("sort_order", 0),
        is_active=data.get("is_active", True),
    )
    db.add(industry)
    return industry


async def update_industry(db: AsyncSession, industry: Industry, actor: User, data: dict) -> Industry:
    allowed = {"name", "slug", "description", "seo_title", "seo_description", "sort_order", "is_active"}
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "slug":
            existing = await db.execute(
                select(Industry).where(and_(Industry.slug == value, Industry.id != industry.id))
            )
            if existing.scalar_one_or_none():
                raise AdminError("Bu slug artıq istifadə olunub")
        setattr(industry, key, value)
    return industry


async def change_industry_status(
    db: AsyncSession,
    industry: Industry,
    actor: User,
    action: str,
    reason: Optional[str] = None,
) -> Industry:
    if action == "activate":
        if industry.is_active:
            raise AdminError("Sənaye artıq aktivdir")
        industry.is_active = True
    elif action == "deactivate":
        if not industry.is_active:
            raise AdminError("Sənaye artıq deaktivdir")
        industry.is_active = False
    elif action == "archive":
        industry.is_active = False
    else:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")
    return industry


# ---------- Regions ----------

async def get_region_or_404(db: AsyncSession, region_id: UUID) -> Region:
    result = await db.execute(
        select(Region)
        .execution_options(populate_existing=True)
        .where(Region.id == region_id)
    )
    region = result.scalar_one_or_none()
    if not region:
        raise AdminError("Region tapılmadı", status.HTTP_404_NOT_FOUND)
    return region


async def list_regions(
    db: AsyncSession,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "sort_asc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Region], int]:
    stmt = select(Region)
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Region.name.ilike(pattern), Region.slug.ilike(pattern)))
    if is_active is not None:
        conditions.append(Region.is_active == is_active)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Region.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "sort_asc": Region.sort_order.asc(),
        "sort_desc": Region.sort_order.desc(),
        "name_asc": Region.name.asc(),
        "created_desc": Region.created_at.desc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["sort_asc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def region_to_out(region: Region) -> RegionOut:
    return RegionOut(
        id=region.id,
        name=region.name,
        slug=region.slug,
        country=region.country,
        city=region.city,
        sort_order=region.sort_order,
        is_active=region.is_active,
        created_at=region.created_at,
        updated_at=region.updated_at,
    )


async def create_region(db: AsyncSession, actor: User, data: dict) -> Region:
    existing = await db.execute(select(Region).where(Region.slug == data["slug"]))
    if existing.scalar_one_or_none():
        raise AdminError("Bu slug artıq istifadə olunub")

    region = Region(
        name=data["name"],
        slug=data["slug"],
        country=data.get("country", "Azərbaycan"),
        city=data.get("city"),
        sort_order=data.get("sort_order", 0),
        is_active=data.get("is_active", True),
    )
    db.add(region)
    return region


async def update_region(db: AsyncSession, region: Region, actor: User, data: dict) -> Region:
    allowed = {"name", "slug", "country", "city", "sort_order", "is_active"}
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "slug":
            existing = await db.execute(
                select(Region).where(and_(Region.slug == value, Region.id != region.id))
            )
            if existing.scalar_one_or_none():
                raise AdminError("Bu slug artıq istifadə olunub")
        setattr(region, key, value)
    return region


async def change_region_status(
    db: AsyncSession,
    region: Region,
    actor: User,
    action: str,
    reason: Optional[str] = None,
) -> Region:
    if action == "activate":
        if region.is_active:
            raise AdminError("Region artıq aktivdir")
        region.is_active = True
    elif action == "deactivate":
        if not region.is_active:
            raise AdminError("Region artıq deaktivdir")
        region.is_active = False
    elif action == "archive":
        region.is_active = False
    else:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")
    return region


# ---------- Internships ----------

async def get_internship_or_404(db: AsyncSession, internship_id: UUID) -> Internship:
    result = await db.execute(
        select(Internship)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Internship.company),
            selectinload(Internship.region),
        )
        .where(Internship.id == internship_id)
    )
    internship = result.scalar_one_or_none()
    if not internship:
        raise AdminError("Təcrübə proqramı tapılmadı", status.HTTP_404_NOT_FOUND)
    return internship


async def list_internships(
    db: AsyncSession,
    q: Optional[str] = None,
    status: Optional[str] = None,
    company_id: Optional[UUID] = None,
    region_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Internship], int]:
    from app.admin.models import ContentStatus

    stmt = select(Internship).options(
        selectinload(Internship.company),
        selectinload(Internship.region),
    )
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Internship.title.ilike(pattern)))
    if status:
        try:
            conditions.append(Internship.status == ContentStatus(status))
        except ValueError:
            raise AdminError(f"Bilinməyən status: {status}")
    if company_id:
        conditions.append(Internship.company_id == company_id)
    if region_id:
        conditions.append(Internship.region_id == region_id)
    if is_featured is not None:
        conditions.append(Internship.is_featured == is_featured)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Internship.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "created_desc": Internship.created_at.desc(),
        "created_asc": Internship.created_at.asc(),
        "title_asc": Internship.title.asc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def internship_to_out(internship: Internship) -> InternshipOut:
    return InternshipOut(
        id=internship.id,
        company_id=internship.company_id,
        company_name=internship.company.name if internship.company else None,
        title=internship.title,
        slug=internship.slug,
        description=internship.description,
        requirements=internship.requirements,
        location=internship.location,
        region_id=internship.region_id,
        region_name=internship.region.name if internship.region else None,
        work_mode=internship.work_mode.value if internship.work_mode else None,
        application_url=internship.application_url,
        application_deadline=internship.application_deadline,
        start_date=internship.start_date,
        end_date=internship.end_date,
        status=internship.status.value,
        moderation_reason=internship.moderation_reason,
        moderation_note=internship.moderation_note,
        admin_note=internship.admin_note,
        is_featured=internship.is_featured,
        featured_until=internship.featured_until,
        views=internship.views,
        applications_count=internship.applications_count,
        created_at=internship.created_at,
        updated_at=internship.updated_at,
    )


async def create_internship(db: AsyncSession, actor: User, data: dict) -> Internship:
    from app.admin.models import ContentStatus

    existing = await db.execute(select(Internship).where(Internship.slug == data["slug"]))
    if existing.scalar_one_or_none():
        raise AdminError("Bu slug artıq istifadə olunub")

    internship = Internship(
        company_id=data["company_id"],
        title=data["title"],
        slug=data["slug"],
        description=data.get("description"),
        requirements=data.get("requirements"),
        location=data.get("location"),
        region_id=data.get("region_id"),
        work_mode=data.get("work_mode"),
        application_url=data.get("application_url"),
        application_deadline=data.get("application_deadline"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        status=ContentStatus(data.get("status", "DRAFT")),
        created_by=actor.id,
    )
    db.add(internship)
    await db.flush()
    internship = await get_internship_or_404(db, internship.id)
    return internship


async def update_internship(db: AsyncSession, internship: Internship, actor: User, data: dict) -> Internship:
    allowed = {
        "title", "slug", "description", "requirements", "location",
        "region_id", "work_mode", "application_url", "application_deadline",
        "start_date", "end_date", "is_featured", "featured_until",
    }
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "slug":
            existing = await db.execute(
                select(Internship).where(and_(Internship.slug == value, Internship.id != internship.id))
            )
            if existing.scalar_one_or_none():
                raise AdminError("Bu slug artıq istifadə olunub")
        if key == "work_mode" and value:
            from app.admin.models import WorkMode
            try:
                value = WorkMode(value)
            except ValueError:
                raise AdminError(f"Bilinməyən iş rejimi: {value}")
        setattr(internship, key, value)
    return internship


async def _add_internship_history(
    db: AsyncSession,
    internship: Internship,
    actor: User,
    to_status: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    from app.admin.models import InternshipModerationHistory
    entry = InternshipModerationHistory(
        internship_id=internship.id,
        from_status=internship.status.value if internship.status else None,
        to_status=to_status,
        actor_id=actor.id,
        actor_email=actor.email,
        reason=reason,
        note=note,
    )
    db.add(entry)


async def change_internship_status(
    db: AsyncSession,
    internship: Internship,
    actor: User,
    action: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> Internship:
    from app.admin.models import ContentStatus

    transitions = {
        "approve": (ContentStatus.APPROVED, {ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW}),
        "reject": (ContentStatus.REJECTED, {ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW}),
        "publish": (ContentStatus.PUBLISHED, {ContentStatus.APPROVED}),
        "unpublish": (ContentStatus.PAUSED, {ContentStatus.PUBLISHED}),
        "feature": (None, {ContentStatus.PUBLISHED, ContentStatus.APPROVED}),
        "archive": (ContentStatus.ARCHIVED, set(ContentStatus) - {ContentStatus.ARCHIVED}),
        "restore": (ContentStatus.DRAFT, {ContentStatus.ARCHIVED, ContentStatus.REJECTED, ContentStatus.PAUSED}),
    }

    if action not in transitions:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")

    target, allowed_from = transitions[action]
    if internship.status not in allowed_from:
        raise AdminError(f"'{internship.status.value}' vəziyyətindən '{target.value if target else action}' vəziyyətinə keçid mümkün deyil")

    await _add_internship_history(db, internship, actor, target.value if target else action, reason, note)

    if action == "approve":
        internship.status = ContentStatus.APPROVED
        internship.moderation_reason = None
        internship.moderation_note = note
    elif action == "reject":
        if not reason or not reason.strip():
            raise AdminError("Rədd etmək üçün səbəb tələb olunur")
        internship.status = ContentStatus.REJECTED
        internship.moderation_reason = reason.strip()
        internship.moderation_note = note
    elif action == "publish":
        internship.status = ContentStatus.PUBLISHED
    elif action == "unpublish":
        internship.status = ContentStatus.PAUSED
    elif action == "feature":
        internship.is_featured = True
        internship.featured_until = internship.end_date
    elif action == "archive":
        internship.status = ContentStatus.ARCHIVED
    elif action == "restore":
        internship.status = ContentStatus.DRAFT
        internship.moderation_reason = None

    return internship


# ---------- Trainings ----------

async def get_training_or_404(db: AsyncSession, training_id: UUID) -> Training:
    result = await db.execute(
        select(Training)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Training.provider),
        )
        .where(Training.id == training_id)
    )
    training = result.scalar_one_or_none()
    if not training:
        raise AdminError("Təlim tapılmadı", status.HTTP_404_NOT_FOUND)
    return training


async def list_trainings(
    db: AsyncSession,
    q: Optional[str] = None,
    status: Optional[str] = None,
    provider_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    sort: str = "created_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Training], int]:
    from app.admin.models import ContentStatus

    stmt = select(Training).options(selectinload(Training.provider))
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Training.title.ilike(pattern)))
    if status:
        try:
            conditions.append(Training.status == ContentStatus(status))
        except ValueError:
            raise AdminError(f"Bilinməyən status: {status}")
    if provider_id:
        conditions.append(Training.provider_id == provider_id)
    if is_featured is not None:
        conditions.append(Training.is_featured == is_featured)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Training.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "created_desc": Training.created_at.desc(),
        "created_asc": Training.created_at.asc(),
        "title_asc": Training.title.asc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def training_to_out(training: Training) -> TrainingOut:
    return TrainingOut(
        id=training.id,
        provider_id=training.provider_id,
        provider_name=training.provider.name if training.provider else None,
        title=training.title,
        slug=training.slug,
        description=training.description,
        location=training.location,
        format=training.format.value if training.format else None,
        price=float(training.price) if training.price is not None else None,
        currency=training.currency,
        application_url=training.application_url,
        start_date=training.start_date,
        end_date=training.end_date,
        application_deadline=training.application_deadline,
        status=training.status.value,
        moderation_reason=training.moderation_reason,
        moderation_note=training.moderation_note,
        admin_note=training.admin_note,
        is_featured=training.is_featured,
        featured_until=training.featured_until,
        views=training.views,
        applications_count=training.applications_count,
        created_at=training.created_at,
        updated_at=training.updated_at,
    )


async def create_training(db: AsyncSession, actor: User, data: dict) -> Training:
    from app.admin.models import ContentStatus

    existing = await db.execute(select(Training).where(Training.slug == data["slug"]))
    if existing.scalar_one_or_none():
        raise AdminError("Bu slug artıq istifadə olunub")

    training = Training(
        provider_id=data["provider_id"],
        title=data["title"],
        slug=data["slug"],
        description=data.get("description"),
        location=data.get("location"),
        format=data.get("format"),
        price=data.get("price"),
        currency=data.get("currency", "AZN"),
        application_url=data.get("application_url"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        application_deadline=data.get("application_deadline"),
        status=ContentStatus(data.get("status", "DRAFT")),
        created_by=actor.id,
    )
    db.add(training)
    await db.flush()
    training = await get_training_or_404(db, training.id)
    return training


async def update_training(db: AsyncSession, training: Training, actor: User, data: dict) -> Training:
    allowed = {
        "title", "slug", "description", "location", "format",
        "price", "currency", "application_url", "start_date",
        "end_date", "application_deadline", "is_featured", "featured_until",
    }
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "slug":
            existing = await db.execute(
                select(Training).where(and_(Training.slug == value, Training.id != training.id))
            )
            if existing.scalar_one_or_none():
                raise AdminError("Bu slug artıq istifadə olunub")
        if key == "format" and value:
            from app.admin.models import TrainingFormat
            try:
                value = TrainingFormat(value)
            except ValueError:
                raise AdminError(f"Bilinməyən format: {value}")
        setattr(training, key, value)
    return training


async def _add_training_history(
    db: AsyncSession,
    training: Training,
    actor: User,
    to_status: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    from app.admin.models import TrainingModerationHistory
    entry = TrainingModerationHistory(
        training_id=training.id,
        from_status=training.status.value if training.status else None,
        to_status=to_status,
        actor_id=actor.id,
        actor_email=actor.email,
        reason=reason,
        note=note,
    )
    db.add(entry)


async def change_training_status(
    db: AsyncSession,
    training: Training,
    actor: User,
    action: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> Training:
    from app.admin.models import ContentStatus

    transitions = {
        "approve": (ContentStatus.APPROVED, {ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW}),
        "reject": (ContentStatus.REJECTED, {ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW}),
        "publish": (ContentStatus.PUBLISHED, {ContentStatus.APPROVED}),
        "unpublish": (ContentStatus.PAUSED, {ContentStatus.PUBLISHED}),
        "feature": (None, {ContentStatus.PUBLISHED, ContentStatus.APPROVED}),
        "archive": (ContentStatus.ARCHIVED, set(ContentStatus) - {ContentStatus.ARCHIVED}),
        "restore": (ContentStatus.DRAFT, {ContentStatus.ARCHIVED, ContentStatus.REJECTED, ContentStatus.PAUSED}),
    }

    if action not in transitions:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")

    target, allowed_from = transitions[action]
    if training.status not in allowed_from:
        raise AdminError(f"'{training.status.value}' vəziyyətindən '{target.value if target else action}' vəziyyətinə keçid mümkün deyil")

    await _add_training_history(db, training, actor, target.value if target else action, reason, note)

    if action == "approve":
        training.status = ContentStatus.APPROVED
        training.moderation_reason = None
        training.moderation_note = note
    elif action == "reject":
        if not reason or not reason.strip():
            raise AdminError("Rədd etmək üçün səbəb tələb olunur")
        training.status = ContentStatus.REJECTED
        training.moderation_reason = reason.strip()
        training.moderation_note = note
    elif action == "publish":
        training.status = ContentStatus.PUBLISHED
    elif action == "unpublish":
        training.status = ContentStatus.PAUSED
    elif action == "feature":
        training.is_featured = True
        training.featured_until = training.end_date
    elif action == "archive":
        training.status = ContentStatus.ARCHIVED
    elif action == "restore":
        training.status = ContentStatus.DRAFT
        training.moderation_reason = None

    return training


# ---------- Advertisements ----------

async def get_ad_or_404(db: AsyncSession, ad_id: UUID) -> Advertisement:
    result = await db.execute(
        select(Advertisement)
        .execution_options(populate_existing=True)
        .options(selectinload(Advertisement.moderation_history))
        .where(Advertisement.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    if not ad:
        raise AdminError("Reklam tapılmadı", status.HTTP_404_NOT_FOUND)
    return ad


async def list_ads(
    db: AsyncSession,
    q: Optional[str] = None,
    placement: Optional[str] = None,
    status: Optional[str] = None,
    advertiser: Optional[str] = None,
    sort: str = "created_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Advertisement], int]:
    from app.admin.models import AdStatus, AdPlacement

    stmt = select(Advertisement)
    conditions = []

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(
            Advertisement.advertiser_name.ilike(pattern),
            Advertisement.campaign_name.ilike(pattern),
            Advertisement.headline.ilike(pattern),
        ))
    if placement:
        try:
            conditions.append(Advertisement.placement == AdPlacement(placement))
        except ValueError:
            raise AdminError(f"Bilinməyən placement: {placement}")
    if status:
        try:
            conditions.append(Advertisement.status == AdStatus(status))
        except ValueError:
            raise AdminError(f"Bilinməyən status: {status}")
    if advertiser:
        conditions.append(Advertisement.advertiser_name.ilike(f"%{advertiser}%"))

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Advertisement.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "created_desc": Advertisement.created_at.desc(),
        "created_asc": Advertisement.created_at.asc(),
        "priority_desc": Advertisement.priority.desc(),
        "start_desc": Advertisement.start_at.desc().nullslast(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def ad_to_out(ad: Advertisement) -> AdvertisementOut:
    ctr = (ad.clicks / ad.impressions * 100) if ad.impressions > 0 else 0
    return AdvertisementOut(
        id=ad.id,
        advertiser_name=ad.advertiser_name,
        campaign_name=ad.campaign_name,
        industry=ad.industry,
        headline=ad.headline,
        description=ad.description,
        cta_label=ad.cta_label,
        destination_url=ad.destination_url,
        alt_text=ad.alt_text,
        placement=ad.placement.value,
        format=ad.format.value,
        creative_image=ad.creative_image,
        mobile_image=ad.mobile_image,
        creative_image_url=ad.creative_image_url,
        mobile_image_url=ad.mobile_image_url,
        creative_file_size=ad.creative_file_size,
        creative_mime_type=ad.creative_mime_type,
        creative_width=ad.creative_width,
        creative_height=ad.creative_height,
        background=ad.background,
        accent_color=ad.accent_color,
        start_at=ad.start_at,
        end_at=ad.end_at,
        priority=ad.priority,
        status=ad.status.value,
        impressions=ad.impressions,
        clicks=ad.clicks,
        ctr=round(ctr, 2),
        created_by=ad.created_by,
        created_at=ad.created_at,
        updated_at=ad.updated_at,
    )


async def create_ad(db: AsyncSession, actor: User, data: dict) -> Advertisement:
    from app.admin.models import AdStatus, AdPlacement, AdFormat

    # Validate placement
    try:
        placement = AdPlacement(data["placement"])
    except ValueError:
        raise AdminError(f"Bilinməyən placement: {data['placement']}")

    # Validate format
    try:
        format_enum = AdFormat(data["format"])
    except ValueError:
        raise AdminError(f"Bilinməyən format: {data['format']}")

    # Validate status
    status = AdStatus(data.get("status", "DRAFT"))

    # Validate destination URL
    dest_url = data.get("destination_url")
    if dest_url and not (dest_url.startswith("http://") or dest_url.startswith("https://")):
        raise AdminError("Destination URL yalnız http:// və ya https:// olmalıdır")

    ad = Advertisement(
        advertiser_name=data["advertiser_name"],
        campaign_name=data["campaign_name"],
        industry=data.get("industry"),
        headline=data.get("headline"),
        description=data.get("description"),
        cta_label=data.get("cta_label"),
        destination_url=dest_url,
        alt_text=data.get("alt_text"),
        placement=placement,
        format=format_enum,
        creative_image=data.get("creative_image"),
        mobile_image=data.get("mobile_image"),
        creative_image_url=data.get("creative_image_url"),
        mobile_image_url=data.get("mobile_image_url"),
        background=data.get("background"),
        accent_color=data.get("accent_color"),
        start_at=data.get("start_at"),
        end_at=data.get("end_at"),
        priority=data.get("priority", 0),
        status=status,
        created_by=actor.id,
    )
    db.add(ad)
    await db.flush()
    return ad


async def update_ad(db: AsyncSession, ad: Advertisement, actor: User, data: dict) -> Advertisement:
    from app.admin.models import AdStatus, AdPlacement, AdFormat

    allowed = {
        "advertiser_name", "campaign_name", "industry", "headline", "description",
        "cta_label", "destination_url", "alt_text", "placement", "format",
        "creative_image", "mobile_image", "creative_image_url", "mobile_image_url",
        "background", "accent_color", "start_at", "end_at", "priority", "status",
    }
    for key, value in data.items():
        if key not in allowed or value is None:
            continue
        if key == "placement":
            try:
                value = AdPlacement(value)
            except ValueError:
                raise AdminError(f"Bilinməyən placement: {value}")
        elif key == "format":
            try:
                value = AdFormat(value)
            except ValueError:
                raise AdminError(f"Bilinməyən format: {value}")
        elif key == "status":
            try:
                value = AdStatus(value)
            except ValueError:
                raise AdminError(f"Bilinməyən status: {value}")
        elif key == "destination_url":
            if value and not (value.startswith("http://") or value.startswith("https://")):
                raise AdminError("Destination URL yalnız http:// və ya https:// olmalıdır")
        setattr(ad, key, value)
    return ad


async def _add_ad_history(
    db: AsyncSession,
    ad: Advertisement,
    actor: User,
    to_status: str,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    from app.admin.models import AdvertisementModerationHistory
    entry = AdvertisementModerationHistory(
        advertisement_id=ad.id,
        from_status=ad.status.value if ad.status else None,
        to_status=to_status,
        actor_id=actor.id,
        actor_email=actor.email,
        reason=reason,
        note=note,
    )
    db.add(entry)


async def change_ad_status(
    db: AsyncSession,
    ad: Advertisement,
    actor: User,
    action: str,
    reason: Optional[str] = None,
) -> Advertisement:
    from app.admin.models import AdStatus

    transitions = {
        "activate": (AdStatus.ACTIVE, {AdStatus.DRAFT, AdStatus.SCHEDULED, AdStatus.PAUSED}),
        "pause": (AdStatus.PAUSED, {AdStatus.ACTIVE}),
        "resume": (AdStatus.ACTIVE, {AdStatus.PAUSED}),
        "archive": (AdStatus.ARCHIVED, set(AdStatus) - {AdStatus.ARCHIVED}),
        "schedule": (AdStatus.SCHEDULED, {AdStatus.DRAFT}),
    }

    if action not in transitions:
        raise AdminError(f"Bilinməyən əməliyyat: {action}")

    target, allowed_from = transitions[action]
    if ad.status not in allowed_from:
        raise AdminError(f"'{ad.status.value}' vəziyyətindən '{target.value}' vəziyyətinə keçid mümkün deyil")

    await _add_ad_history(db, ad, actor, target.value, reason)

    ad.status = target
    if action == "activate":
        ad.start_at = ad.start_at or datetime.now(timezone.utc)
    return ad


async def increment_impressions(db: AsyncSession, ad_id: UUID) -> None:
    from sqlalchemy import update
    await db.execute(
        update(Advertisement)
        .where(Advertisement.id == ad_id)
        .values(impressions=Advertisement.impressions + 1)
    )


async def increment_clicks(db: AsyncSession, ad_id: UUID) -> None:
    from sqlalchemy import update
    await db.execute(
        update(Advertisement)
        .where(Advertisement.id == ad_id)
        .values(clicks=Advertisement.clicks + 1)
    )


async def get_active_ads_for_placement(
    db: AsyncSession,
    placement: str,
    limit: int = 1,
) -> list[Advertisement]:
    from app.admin.models import AdStatus, AdPlacement

    now = datetime.now(timezone.utc)
    try:
        placement_enum = AdPlacement(placement)
    except ValueError:
        return []

    stmt = (
        select(Advertisement)
        .where(
            and_(
                Advertisement.placement == placement_enum,
                Advertisement.status == AdStatus.ACTIVE,
                Advertisement.start_at <= now,
                or_(Advertisement.end_at.is_(None), Advertisement.end_at >= now),
            )
        )
        .order_by(Advertisement.priority.desc(), Advertisement.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().unique())


# ---------- Dashboard ----------

async def build_dashboard(db: AsyncSession, actor: User) -> DashboardResponse:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    job_rows = (await db.execute(select(Job.status, func.count()).group_by(Job.status))).all()
    jobs = {s.value: c for s, c in job_rows}

    companies_rows = (await db.execute(select(Company.status, func.count()).group_by(Company.status))).all()
    companies = {s.value: c for s, c in companies_rows}

    users_total = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    users_new_today = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .where(User.created_at >= today_start)
        )
    ).scalar() or 0
    users_suspended = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .where(User.status == UserStatus.SUSPENDED)
        )
    ).scalar() or 0
    admins_count = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .where(User.role.in_([
                "SUPER_ADMIN", "ADMIN", "MODERATOR", "CONTENT_MANAGER",
                "AD_MANAGER", "SUPPORT", "FINANCE_VIEWER",
            ]))
        )
    ).scalar() or 0

    ads_rows = (await db.execute(select(Advertisement.status, func.count()).group_by(Advertisement.status))).all()
    ads = {s.value: c for s, c in ads_rows}

    premium_count = (
        await db.execute(select(func.count()).select_from(Job).where(Job.is_premium))
    ).scalar() or 0
    featured_count = (
        await db.execute(select(func.count()).select_from(Job).where(Job.is_featured))
    ).scalar() or 0
    urgent_count = (
        await db.execute(select(func.count()).select_from(Job).where(Job.is_urgent))
    ).scalar() or 0

    queue_rows = (
        await db.execute(
            select(Job)
            .options(
                selectinload(Job.company),
                selectinload(Job.category),
                selectinload(Job.region),
            )
            .where(Job.status == JobStatus.PENDING_REVIEW)
            .order_by(Job.created_at.desc())
            .limit(10)
        )
    ).scalars().all()

    audit_rows = (
        await db.execute(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)
        )
    ).scalars().all()

    return DashboardResponse(
        jobs={
            "by_status": jobs,
            "total": sum(jobs.values()),
            "premium": premium_count,
            "featured": featured_count,
            "urgent": urgent_count,
        },
        companies={"by_status": companies, "total": sum(companies.values())},
        users={
            "total": users_total,
            "new_today": users_new_today,
            "suspended": users_suspended,
            "admins": admins_count,
        },
        applications={"total": 0, "today": 0, "this_week": 0},
        ads={"by_status": ads, "total": sum(ads.values())},
        finance={"revenue_today": 0, "revenue_month": 0, "refunds": 0},
        moderation_queue=[job_to_out(j) for j in queue_rows],
        recent_audit=[
            {
                "id": a.id,
                "actor_email": a.actor_email,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "created_at": a.created_at,
            }
            for a in audit_rows
        ],
        system_status=await system_status(db),
    )


async def system_status(db: AsyncSession) -> dict:
    import socket
    from app.core.redis import get_redis
    from app.core.config import settings

    result = {"api": "ok", "postgres": "ok", "redis": "ok", "worker": "offline", "mail": "offline"}
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        result["postgres"] = "error"
    try:
        redis_client = await get_redis()
        await redis_client.ping()
    except Exception:
        result["redis"] = "error"
    try:
        with socket.create_connection((settings.worker_url.host, settings.worker_url.port), timeout=1.5):
            result["worker"] = "ok"
    except Exception:
        result["worker"] = "offline"
    try:
        with socket.create_connection((settings.mail_host, settings.mail_port), timeout=1.5):
            result["mail"] = "ok"
    except Exception:
        result["mail"] = "offline"
    return result
