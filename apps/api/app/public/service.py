"""
Public marketplace service for Joblane.

Read-only queries against the canonical admin SQLAlchemy models.
Only publicly visible content is ever selected:
- Jobs: status PUBLISHED, not expired, from a public company.
- Companies: status VERIFIED or ACTIVE.

All dates are UTC-aware. Internal moderation/admin fields are never
serialized here.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.models import (
    Job,
    JobStatus,
    JobCategory,
    Region,
    Industry,
    Company,
    CompanyStatus,
    EmploymentType,
    WorkMode,
)
from app.public.schemas import (
    PublicJob,
    PublicJobDetail,
    PublicCompany,
    PublicCompanyDetail,
    PublicCompanySummary,
    PublicCategory,
    PublicIndustry,
    PublicRegion,
)

PUBLIC_COMPANY_STATUSES = (CompanyStatus.VERIFIED, CompanyStatus.ACTIVE)
MAX_LIMIT = 100


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _public_company_condition() -> list:
    return [Company.status.in_(PUBLIC_COMPANY_STATUSES)]


def _job_public_conditions(now: datetime) -> list:
    return [
        Job.status == JobStatus.PUBLISHED,
        or_(Job.expiration_date.is_(None), Job.expiration_date >= now),
        Company.status.in_(PUBLIC_COMPANY_STATUSES),
    ]


def _parse_enum(enum_cls, value: Optional[str], field: str):
    if value is None:
        return None
    try:
        return enum_cls(value.upper())
    except ValueError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Bilinməyən {field} dəyəri: {value}",
        )


def _promo_score(now: datetime):
    return case(
        (
            and_(
                Job.is_premium.is_(True),
                or_(Job.premium_until.is_(None), Job.premium_until >= now),
            ),
            1000 + Job.boost_priority,
        ),
        (
            and_(
                Job.is_featured.is_(True),
                or_(Job.featured_until.is_(None), Job.featured_until >= now),
            ),
            100,
        ),
        (
            and_(
                Job.is_urgent.is_(True),
                or_(Job.urgent_until.is_(None), Job.urgent_until >= now),
            ),
            10,
        ),
        else_=0,
    )


def _active_flag_condition(flag, until):
    return and_(flag.is_(True), or_(until.is_(None), until >= utcnow()))


async def _count_active_jobs_by(db: AsyncSession, column, now: datetime) -> dict:
    """active_jobs_count per key column, counting only PUBLIC non-expired jobs."""
    stmt = (
        select(column, func.count(Job.id))
        .where(
            Job.status == JobStatus.PUBLISHED,
            or_(Job.expiration_date.is_(None), Job.expiration_date >= now),
            Job.company_id.in_(
                select(Company.id).where(Company.status.in_(PUBLIC_COMPANY_STATUSES))
            ),
        )
        .group_by(column)
    )
    result = await db.execute(stmt)
    return {row[0]: row[1] for row in result.all() if row[0] is not None}


# ---------- Job serialization ----------

def _company_summary(company: Optional[Company]) -> PublicCompanySummary:
    if not company:
        return PublicCompanySummary(id=UUID(int=0), name="", slug="")
    return PublicCompanySummary(
        id=company.id,
        name=company.name,
        slug=company.slug,
        logo_url=company.logo_url,
        industry=company.industry,
        verified=company.status == CompanyStatus.VERIFIED,
    )


def job_to_public(job: Job) -> PublicJob:
    return PublicJob(
        id=job.id,
        slug=job.slug,
        title=job.title,
        description=job.description,
        salary_min=float(job.salary_min) if job.salary_min is not None else None,
        salary_max=float(job.salary_max) if job.salary_max is not None else None,
        salary_currency=job.salary_currency,
        salary_period=job.salary_period,
        salary_visible=job.salary_visible,
        location=job.location,
        region_id=job.region_id,
        region_name=job.region.name if job.region else None,
        category_id=job.category_id,
        category_name=job.category.name if job.category else None,
        category_slug=job.category.slug if job.category else None,
        industry=job.industry,
        industry_id=job.industry_id,
        industry_name=job.industry_rel.name if job.industry_rel else None,
        employment_type=job.employment_type.value if job.employment_type else None,
        work_mode=job.work_mode.value if job.work_mode else None,
        experience_level=job.experience_level,
        education=job.education,
        application_deadline=job.application_deadline,
        publication_date=job.publication_date,
        expiration_date=job.expiration_date,
        is_premium=job.is_premium,
        is_featured=job.is_featured,
        is_urgent=job.is_urgent,
        views=job.views,
        company=_company_summary(job.company),
    )


def job_to_public_detail(job: Job, company_active_jobs_count: Optional[int] = None) -> PublicJobDetail:
    base = job_to_public(job)
    data = base.model_dump()
    data["requirements"] = job.requirements
    data["responsibilities"] = job.responsibilities
    data["benefits"] = job.benefits
    if job.company:
        profile = company_to_public(job.company)
        if company_active_jobs_count is not None:
            profile.active_jobs_count = company_active_jobs_count
        data["company_profile"] = profile
    return PublicJobDetail(**data)


# ---------- Company serialization ----------

def company_to_public(company: Company) -> PublicCompany:
    return PublicCompany(
        id=company.id,
        name=company.name,
        slug=company.slug,
        description=company.description,
        logo_url=company.logo_url,
        cover_url=company.cover_url,
        website=company.website,
        address=company.address,
        industry=company.industry,
        industry_id=company.industry_id,
        industry_name=company.industry_rel.name if company.industry_rel else None,
        verified=company.status == CompanyStatus.VERIFIED,
        active_jobs_count=0,
        created_at=company.created_at,
    )


# ---------- Jobs ----------

def _job_order(sort: Optional[str], now: datetime):
    if sort == "newest":
        return [Job.publication_date.desc().nullslast(), Job.created_at.desc()]
    if sort == "salary_desc":
        return [Job.salary_max.desc().nullslast(), Job.salary_min.desc().nullslast()]
    if sort == "salary_asc":
        return [Job.salary_min.asc().nullslast(), Job.salary_max.asc().nullslast()]
    return [_promo_score(now).desc(), Job.publication_date.desc().nullslast(), Job.created_at.desc()]


async def list_jobs(
    db: AsyncSession,
    q: Optional[str] = None,
    location: Optional[str] = None,
    region: Optional[str] = None,
    region_id: Optional[UUID] = None,
    category: Optional[str] = None,
    category_id: Optional[UUID] = None,
    industry: Optional[str] = None,
    industry_id: Optional[UUID] = None,
    employment_type: Optional[str] = None,
    work_mode: Optional[str] = None,
    experience_level: Optional[str] = None,
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    premium: Optional[bool] = None,
    featured: Optional[bool] = None,
    urgent: Optional[bool] = None,
    company: Optional[str] = None,
    company_id: Optional[UUID] = None,
    sort: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Job], int]:
    now = utcnow()

    stmt = select(Job).options(
        selectinload(Job.company),
        selectinload(Job.category),
        selectinload(Job.region),
        selectinload(Job.industry_rel),
    ).join(Company, Job.company_id == Company.id)

    conditions = _job_public_conditions(now)

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(
            or_(
                Job.title.ilike(pattern),
                Company.name.ilike(pattern),
                Job.description.ilike(pattern),
            )
        )
    if location:
        conditions.append(Job.location.ilike(f"%{location.strip()}%"))
    if region:
        pattern = f"%{region.strip()}%"
        stmt = stmt.join(Region, Job.region_id == Region.id)
        conditions.append(or_(Region.slug.ilike(pattern), Region.name.ilike(pattern)))
    if region_id:
        conditions.append(Job.region_id == region_id)
    if category:
        stmt = stmt.join(JobCategory, Job.category_id == JobCategory.id)
        conditions.append(JobCategory.slug == category.strip())
    if category_id:
        conditions.append(Job.category_id == category_id)
    if industry:
        pattern = f"%{industry.strip()}%"
        stmt = stmt.join(Industry, Job.industry_id == Industry.id, isouter=True)
        conditions.append(
            or_(Job.industry.ilike(pattern), Industry.slug.ilike(pattern))
        )
    if industry_id:
        conditions.append(Job.industry_id == industry_id)
    if employment_type:
        conditions.append(Job.employment_type == _parse_enum(EmploymentType, employment_type, "employment_type"))
    if work_mode:
        conditions.append(Job.work_mode == _parse_enum(WorkMode, work_mode, "work_mode"))
    if experience_level:
        conditions.append(Job.experience_level.ilike(f"%{experience_level.strip()}%"))
    if salary_min is not None:
        conditions.append(
            or_(Job.salary_max.is_(None), Job.salary_max >= salary_min)
        )
    if salary_max is not None:
        conditions.append(
            or_(Job.salary_min.is_(None), Job.salary_min <= salary_max)
        )
    if premium:
        conditions.append(_active_flag_condition(Job.is_premium, Job.premium_until))
    if featured:
        conditions.append(_active_flag_condition(Job.is_featured, Job.featured_until))
    if urgent:
        conditions.append(_active_flag_condition(Job.is_urgent, Job.urgent_until))
    if company:
        conditions.append(Company.slug == company.strip())
    if company_id:
        conditions.append(Job.company_id == company_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Job.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    page = max(1, page)
    limit = min(max(1, limit), MAX_LIMIT)
    stmt = stmt.order_by(*_job_order(sort, now))
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().unique())
    return items, total


def _load_public_job_stmt(slug: str):
    return (
        select(Job)
        .options(
            selectinload(Job.company),
            selectinload(Job.category),
            selectinload(Job.region),
            selectinload(Job.industry_rel),
        )
        .join(Company, Job.company_id == Company.id)
        .where(Job.slug == slug)
    )


async def get_public_job(db: AsyncSession, slug: str) -> Optional[Job]:
    now = utcnow()
    result = await db.execute(
        _load_public_job_stmt(slug).where(and_(*_job_public_conditions(now)))
    )
    return result.scalars().first()


async def list_related_jobs(db: AsyncSession, slug: str, limit: int = 4) -> list[Job]:
    now = utcnow()
    job = await get_public_job(db, slug)
    if not job:
        return []

    conditions = _job_public_conditions(now) + [Job.id != job.id]
    same_category = Job.category_id.is_not(None) & (Job.category_id == job.category_id)
    same_company = Job.company_id == job.company_id
    conditions.append(or_(same_category, same_company))

    stmt = (
        select(Job)
        .options(
            selectinload(Job.company),
            selectinload(Job.category),
            selectinload(Job.region),
            selectinload(Job.industry_rel),
        )
        .join(Company, Job.company_id == Company.id)
        .where(and_(*conditions))
        .order_by(*_job_order("newest", now))
        .limit(min(max(1, limit), 20))
    )
    result = await db.execute(stmt)
    return list(result.scalars().unique())


# ---------- Companies ----------

async def list_companies(
    db: AsyncSession,
    q: Optional[str] = None,
    location: Optional[str] = None,
    industry: Optional[str] = None,
    industry_id: Optional[UUID] = None,
    verified: Optional[bool] = None,
    sort: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[tuple[Company, int]], int]:
    now = utcnow()

    conditions = _public_company_condition()

    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(
            or_(Company.name.ilike(pattern), Company.description.ilike(pattern))
        )
    if location:
        conditions.append(Company.address.ilike(f"%{location.strip()}%"))
    if industry:
        pattern = f"%{industry.strip()}%"
        conditions.append(
            or_(Company.industry.ilike(pattern), Company.industry_rel.has(Industry.slug.ilike(pattern)))
        )
    if industry_id:
        conditions.append(Company.industry_id == industry_id)
    if verified:
        conditions.append(Company.status == CompanyStatus.VERIFIED)

    base_stmt = (
        select(Company)
        .options(selectinload(Company.industry_rel))
        .where(and_(*conditions))
    )

    count_stmt = select(func.count()).select_from(
        base_stmt.with_only_columns(Company.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    active_sub = (
        select(Job.company_id, func.count(Job.id).label("active_jobs_count"))
        .where(
            Job.status == JobStatus.PUBLISHED,
            or_(Job.expiration_date.is_(None), Job.expiration_date >= now),
        )
        .group_by(Job.company_id)
        .subquery()
    )

    stmt = (
        select(Company, func.coalesce(active_sub.c.active_jobs_count, 0))
        .options(selectinload(Company.industry_rel))
        .outerjoin(active_sub, Company.id == active_sub.c.company_id)
        .where(and_(*conditions))
    )

    if sort == "name_asc":
        stmt = stmt.order_by(Company.name.asc())
    elif sort == "name_desc":
        stmt = stmt.order_by(Company.name.desc())
    elif sort == "newest":
        stmt = stmt.order_by(Company.created_at.desc(), Company.name.asc())
    else:
        stmt = stmt.order_by(
            active_sub.c.active_jobs_count.desc().nullslast(),
            Company.name.asc(),
        )

    page = max(1, page)
    limit = min(max(1, limit), MAX_LIMIT)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    rows = [(company, int(count or 0)) for company, count in result.all()]
    return rows, total


async def get_public_company(db: AsyncSession, slug: str) -> Optional[Company]:
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.industry_rel))
        .where(Company.slug == slug, and_(*_public_company_condition()))
    )
    return result.scalars().first()


async def get_company_active_jobs_count(db: AsyncSession, company_id: UUID) -> int:
    now = utcnow()
    stmt = (
        select(func.count(Job.id))
        .where(
            Job.company_id == company_id,
            Job.status == JobStatus.PUBLISHED,
            or_(Job.expiration_date.is_(None), Job.expiration_date >= now),
        )
    )
    return (await db.execute(stmt)).scalar() or 0


# ---------- Categories / Industries / Regions ----------

async def list_categories(db: AsyncSession, page: int = 1, limit: int = 100) -> tuple[list[tuple[JobCategory, int]], int]:
    now = utcnow()
    counts = await _count_active_jobs_by(db, Job.category_id, now)

    stmt = (
        select(JobCategory)
        .where(JobCategory.is_active.is_(True))
        .order_by(JobCategory.sort_order.asc(), JobCategory.name.asc())
    )
    total = (await db.execute(
        select(func.count()).select_from(stmt.with_only_columns(JobCategory.id).order_by(None).subquery())
    )).scalar() or 0

    limit = min(max(1, limit), 500)
    page = max(1, page)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().all())
    return [(c, counts.get(c.id, 0)) for c in items], total


async def list_industries(db: AsyncSession, page: int = 1, limit: int = 100) -> tuple[list[tuple[Industry, int]], int]:
    now = utcnow()
    counts = await _count_active_jobs_by(db, Job.industry_id, now)

    stmt = (
        select(Industry)
        .where(Industry.is_active.is_(True))
        .order_by(Industry.sort_order.asc(), Industry.name.asc())
    )
    total = (await db.execute(
        select(func.count()).select_from(stmt.with_only_columns(Industry.id).order_by(None).subquery())
    )).scalar() or 0

    limit = min(max(1, limit), 500)
    page = max(1, page)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().all())
    return [(i, counts.get(i.id, 0)) for i in items], total


async def list_regions(db: AsyncSession, page: int = 1, limit: int = 100) -> tuple[list[tuple[Region, int]], int]:
    now = utcnow()
    counts = await _count_active_jobs_by(db, Job.region_id, now)

    stmt = (
        select(Region)
        .where(Region.is_active.is_(True))
        .order_by(Region.sort_order.asc(), Region.name.asc())
    )
    total = (await db.execute(
        select(func.count()).select_from(stmt.with_only_columns(Region.id).order_by(None).subquery())
    )).scalar() or 0

    limit = min(max(1, limit), 500)
    page = max(1, page)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    items = list(result.scalars().all())
    return [(r, counts.get(r.id, 0)) for r in items], total


def pagination_meta(total: int, page: int, limit: int) -> dict:
    total_pages = max(1, (total + limit - 1) // limit) if total else 0
    return {"total": total, "page": page, "limit": limit, "totalPages": total_pages}