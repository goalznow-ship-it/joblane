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
    Advertisement,
    AuditLog,
    Promotion,
    PromotionType,
    PromotionStatus,
)
from app.admin.schemas import (
    JobOut,
    JobDetailOut,
    ModerationHistoryOut,
    DashboardResponse,
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
