"""
Business logic for the employer portal.

All operations are company-scoped: the caller's EmployerContext determines
which company is being operated on, and every job/application lookup is
filtered by that company id. Admin-only fields (premium, featured, urgent,
admin_note, publication date, status) are never writable here.
"""

import re
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.models import (
    Company,
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyMemberRole,
    CompanyStatus,
    Job,
    JobCategory,
    JobModerationHistory,
    JobStatus,
    EmploymentType,
    WorkMode,
    Region,
    Industry,
    Application,
    ApplicationStatus,
)
from app.admin.audit import record_audit
from app.auth.models import User
from app.candidate.models import ApplicationHistory
from app.notifications.service import create_notification
from app.notifications.models import NotificationType
from app.employer.deps import EmployerContext, EmployerError
from app.employer.schemas import (
    ApplicationOut,
    CompanyCreateRequest,
    CompanyOut,
    CompanyUpdateRequest,
    DashboardResponse,
    EmployerJobDetailOut,
    EmployerJobOut,
    JobCreateRequest,
    JobUpdateRequest,
    MembershipOut,
)


DEFAULT_VACANCY_DURATION_DAYS = 30


def utcnow():
    return datetime.now(timezone.utc)

EMPLOYER_EDITABLE_JOB_FIELDS = {
    "title",
    "description",
    "requirements",
    "responsibilities",
    "benefits",
    "salary_min",
    "salary_max",
    "salary_currency",
    "salary_period",
    "salary_visible",
    "location",
    "region_id",
    "category_id",
    "industry",
    "employment_type",
    "work_mode",
    "experience_level",
    "education",
    "application_deadline",
}

EMPLOYER_EDITABLE_COMPANY_FIELDS = {
    "name",
    "description",
    "website",
    "email",
    "phone",
    "address",
    "socials",
    "industry_id",
    "logo_url",
    "cover_url",
}

APPLICATION_TRANSITIONS: dict[str, set[str]] = {
    "SUBMITTED": {"VIEWED", "SHORTLISTED", "REJECTED"},
    "VIEWED": {"SHORTLISTED", "REJECTED"},
    "SHORTLISTED": {"INTERVIEW", "REJECTED"},
    "INTERVIEW": {"HIRED", "REJECTED"},
    "REJECTED": set(),
    "HIRED": set(),
    "WITHDRAWN": set(),
}


def slugify(name: str) -> str:
    s = name.lower().replace("ə", "e").replace("ö", "o").replace("ü", "u").replace("ı", "i")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


async def unique_company_slug(db: AsyncSession, name: str) -> str:
    base = slugify(name) or "sirket"
    candidate = base
    counter = 1
    while True:
        result = await db.execute(select(Company.id).where(Company.slug == candidate))
        if not result.scalar_one_or_none():
            return candidate
        counter += 1
        candidate = f"{base}-{counter}"


async def unique_job_slug(db: AsyncSession, title: str, company: Company) -> str:
    base = slugify(title)
    company_part = slugify(company.name)
    base = f"{base}-{company_part}"[:200] or "vakansiya"
    candidate = base
    counter = 1
    while True:
        result = await db.execute(select(Job.id).where(Job.slug == candidate))
        if not result.scalar_one_or_none():
            return candidate
        counter += 1
        candidate = f"{base}-{counter}"


async def _company_active_jobs_count(db: AsyncSession, company_id: UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Job)
        .where(
            Job.company_id == company_id,
            Job.status.in_([JobStatus.APPROVED, JobStatus.PUBLISHED]),
        )
    )
    return result.scalar() or 0


async def company_to_out(
    db: AsyncSession, company: Company, with_counts: bool = True
) -> CompanyOut:
    industry = company.industry_rel
    active = 0
    total = 0
    if with_counts:
        result = await db.execute(
            select(func.count()).select_from(Job).where(Job.company_id == company.id)
        )
        total = result.scalar() or 0
        active = await _company_active_jobs_count(db, company.id)
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
        industry_id=company.industry_id,
        industry_name=industry.name if industry else None,
        logo_url=company.logo_url,
        cover_url=company.cover_url,
        status=company.status.value,
        verified_at=company.verified_at,
        verification_notes=company.verification_notes,
        active_jobs_count=active,
        total_jobs_count=total,
        created_at=company.created_at,
        updated_at=company.updated_at,
    )


async def list_memberships(db: AsyncSession, user_id: UUID) -> list[MembershipOut]:
    result = await db.execute(
        select(CompanyMembership)
        .options(selectinload(CompanyMembership.company))
        .where(CompanyMembership.user_id == user_id)
        .order_by(CompanyMembership.created_at.asc())
    )
    memberships = list(result.scalars().unique())
    out = []
    for m in memberships:
        out.append(
            MembershipOut(
                id=m.id,
                company_id=m.company_id,
                company_name=m.company.name,
                company_status=m.company.status.value,
                role=m.role.value,
                status=m.status.value,
            )
        )
    return out


# ---------- Company ----------

async def create_company(
    db: AsyncSession,
    user: User,
    data: CompanyCreateRequest,
    request: Request,
) -> Company:
    existing = await db.execute(
        select(CompanyMembership.id).where(
            CompanyMembership.user_id == user.id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    if existing.scalar_one_or_none():
        raise EmployerError("Siz artıq aktiv şirkətə bağlısınız")

    slug = data.slug or await unique_company_slug(db, data.name)
    if data.slug:
        existing_slug = await db.execute(select(Company.id).where(Company.slug == data.slug))
        if existing_slug.scalar_one_or_none():
            raise EmployerError("Bu slug artıq istifadə olunur")

    if data.industry_id:
        industry = await db.get(Industry, data.industry_id)
        if not industry:
            raise EmployerError("Sənaye sahəsi tapılmadı", 404)

    company = Company(
        name=data.name,
        slug=slug,
        description=data.description,
        website=data.website,
        email=data.email,
        phone=data.phone,
        address=data.address,
        socials=data.socials,
        industry_id=data.industry_id,
        logo_url=data.logo_url,
        cover_url=data.cover_url,
        status=CompanyStatus.PENDING,
    )
    db.add(company)
    await db.flush()

    membership = CompanyMembership(
        company_id=company.id,
        user_id=user.id,
        role=CompanyMemberRole.OWNER,
        status=CompanyMembershipStatus.ACTIVE,
    )
    db.add(membership)

    await record_audit(
        db,
        actor=user,
        action="employer.company.created",
        entity_type="company",
        entity_id=company.id,
        after={
            "name": company.name,
            "slug": company.slug,
            "industry_id": str(company.industry_id) if company.industry_id else None,
        },
        request=request,
    )
    await db.flush()
    return company


async def update_company(
    db: AsyncSession,
    ctx: EmployerContext,
    data: CompanyUpdateRequest,
    request: Request,
) -> Company:
    company = ctx.company
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise EmployerError("Yenilənəcək sahə yoxdur")

    if "industry_id" in payload and payload["industry_id"] is not None:
        industry = await db.get(Industry, payload["industry_id"])
        if not industry:
            raise EmployerError("Sənaye sahəsi tapılmadı", 404)

    before = {k: getattr(company, k) for k in EMPLOYER_EDITABLE_COMPANY_FIELDS}
    for field, value in payload.items():
        if field not in EMPLOYER_EDITABLE_COMPANY_FIELDS:
            raise EmployerError(f"Bu sahə redaktə edilə bilməz: {field}")
        setattr(company, field, value)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.company.updated",
        entity_type="company",
        entity_id=company.id,
        before=before,
        after={k: getattr(company, k) for k in EMPLOYER_EDITABLE_COMPANY_FIELDS},
        request=request,
    )
    await db.flush()
    return company


# ---------- Dashboard ----------

async def dashboard(db: AsyncSession, ctx: EmployerContext) -> DashboardResponse:
    company_id = ctx.company.id

    job_counts: dict[JobStatus, int] = {}
    result = await db.execute(
        select(Job.status, func.count())
        .where(Job.company_id == company_id)
        .group_by(Job.status)
    )
    for status_value, count in result.all():
        job_counts[status_value] = count

    app_counts: dict[ApplicationStatus, int] = {}
    result = await db.execute(
        select(Application.status, func.count())
        .join(Job, Application.job_id == Job.id)
        .where(Job.company_id == company_id)
        .group_by(Application.status)
    )
    for status_value, count in result.all():
        app_counts[status_value] = count

    views_result = await db.execute(
        select(func.coalesce(func.sum(Job.views), 0)).where(Job.company_id == company_id)
    )
    total_views = views_result.scalar() or 0

    recent = await list_applications(db, ctx, page=1, limit=5)

    company_out = await company_to_out(db, ctx.company)

    return DashboardResponse(
        company=company_out,
        jobs_total=sum(job_counts.values()),
        jobs_draft=job_counts.get(JobStatus.DRAFT, 0),
        jobs_pending_review=job_counts.get(JobStatus.PENDING_REVIEW, 0),
        jobs_published=job_counts.get(JobStatus.PUBLISHED, 0) + job_counts.get(JobStatus.APPROVED, 0),
        jobs_paused=job_counts.get(JobStatus.PAUSED, 0),
        jobs_rejected=job_counts.get(JobStatus.REJECTED, 0),
        jobs_archived=job_counts.get(JobStatus.ARCHIVED, 0),
        applications_total=sum(app_counts.values()),
        applications_new=app_counts.get(ApplicationStatus.SUBMITTED, 0),
        applications_shortlisted=app_counts.get(ApplicationStatus.SHORTLISTED, 0),
        applications_interview=app_counts.get(ApplicationStatus.INTERVIEW, 0),
        applications_hired=app_counts.get(ApplicationStatus.HIRED, 0),
        total_views=total_views,
        recent_applications=[a for a in recent[0]],
    )


# ---------- Jobs ----------

def _job_to_out(job: Job) -> EmployerJobOut:
    return EmployerJobOut(
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
        status=job.status.value,
        moderation_reason=job.moderation_reason,
        moderation_note=job.moderation_note,
        publication_date=job.publication_date,
        expiration_date=job.expiration_date,
        is_premium=job.is_premium,
        is_featured=job.is_featured,
        is_urgent=job.is_urgent,
        views=job.views,
        applications_count=job.applications_count,
        favorites_count=job.favorites_count,
        created_by=job.created_by,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _job_detail_out(job: Job) -> EmployerJobDetailOut:
    base = _job_to_out(job)
    data = base.model_dump()
    data["moderation_history"] = [
        {
            "id": h.id,
            "from_status": h.from_status,
            "to_status": h.to_status,
            "actor_id": h.actor_id,
            "actor_email": h.actor_email,
            "reason": h.reason,
            "note": h.note,
            "created_at": h.created_at,
        }
        for h in (job.moderation_history or [])
    ]
    return EmployerJobDetailOut(**data)


async def list_jobs(
    db: AsyncSession,
    ctx: EmployerContext,
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    sort: str = "created_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[EmployerJobOut], int]:
    stmt = (
        select(Job)
        .options(selectinload(Job.company))
        .where(Job.company_id == ctx.company.id)
    )
    conditions = []
    if q:
        conditions.append(Job.title.ilike(f"%{q.strip()}%"))
    if status_filter:
        try:
            conditions.append(Job.status == JobStatus(status_filter))
        except ValueError:
            raise EmployerError(f"Bilinməyən status: {status_filter}")
    if conditions:
        stmt = stmt.where(*conditions)

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Job.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "created_desc": Job.created_at.desc(),
        "created_asc": Job.created_at.asc(),
        "applications_desc": Job.applications_count.desc(),
        "views_desc": Job.views.desc(),
        "title_asc": Job.title.asc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["created_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    jobs = list(result.scalars().unique())
    return [_job_to_out(j) for j in jobs], total


async def get_job_or_404(db: AsyncSession, ctx: EmployerContext, job_id: UUID) -> Job:
    result = await db.execute(
        select(Job)
        .options(
            selectinload(Job.company),
            selectinload(Job.moderation_history),
        )
        .where(Job.id == job_id, Job.company_id == ctx.company.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise EmployerError("Vakansiya tapılmadı", 404)
    return job


async def create_job(
    db: AsyncSession,
    ctx: EmployerContext,
    data: JobCreateRequest,
    request: Request,
) -> Job:
    if data.salary_min is not None and data.salary_max is not None:
        if data.salary_min > data.salary_max:
            raise EmployerError("Minimum əmək haqqı maksimumdan böyük ola bilməz")

    if data.region_id:
        region = await db.get(Region, data.region_id)
        if not region:
            raise EmployerError("Region tapılmadı", 404)
    if data.category_id:
        category = await db.get(JobCategory, data.category_id)
        if not category:
            raise EmployerError("Kateqoriya tapılmadı", 404)

    slug = await unique_job_slug(db, data.title, ctx.company)

    job = Job(
        company_id=ctx.company.id,
        title=data.title,
        slug=slug,
        description=data.description,
        requirements=data.requirements,
        responsibilities=data.responsibilities,
        benefits=data.benefits,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        salary_currency=data.salary_currency,
        salary_period=data.salary_period,
        salary_visible=data.salary_visible,
        location=data.location,
        region_id=data.region_id,
        category_id=data.category_id,
        industry=data.industry,
        employment_type=EmploymentType(data.employment_type),
        work_mode=WorkMode(data.work_mode) if data.work_mode else None,
        experience_level=data.experience_level,
        education=data.education,
        application_deadline=data.application_deadline,
        status=JobStatus.DRAFT,
        created_by=ctx.user.id,
    )
    db.add(job)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.job.created",
        entity_type="job",
        entity_id=job.id,
        after={"title": job.title, "slug": job.slug},
        request=request,
    )
    await db.flush()
    return job


async def update_job(
    db: AsyncSession,
    ctx: EmployerContext,
    job: Job,
    data: JobUpdateRequest,
    request: Request,
) -> Job:
    if job.status not in (JobStatus.DRAFT, JobStatus.REJECTED):
        raise EmployerError("Yalnız layihə (DRAFT) və ya rədd edilmiş vakansiyalar redaktə edilə bilər")

    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise EmployerError("Yenilənəcək sahə yoxdur")

    if "salary_min" in payload and "salary_max" in payload:
        smin = payload["salary_min"]
        smax = payload["salary_max"]
        if smin is not None and smax is not None and smin > smax:
            raise EmployerError("Minimum əmək haqqı maksimumdan böyük ola bilməz")

    if "region_id" in payload and payload["region_id"] is not None:
        region = await db.get(Region, payload["region_id"])
        if not region:
            raise EmployerError("Region tapılmadı", 404)
    if "category_id" in payload and payload["category_id"] is not None:
        category = await db.get(JobCategory, payload["category_id"])
        if not category:
            raise EmployerError("Kateqoriya tapılmadı", 404)

    before = {k: getattr(job, k) for k in EMPLOYER_EDITABLE_JOB_FIELDS}
    for field, value in payload.items():
        if field not in EMPLOYER_EDITABLE_JOB_FIELDS:
            raise EmployerError(f"Bu sahə redaktə edilə bilməz: {field}")
        if field == "employment_type" and value is not None:
            value = EmploymentType(value)
        if field == "work_mode" and value is not None:
            value = WorkMode(value)
        setattr(job, field, value)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.job.updated",
        entity_type="job",
        entity_id=job.id,
        before=before,
        after={k: getattr(job, k) for k in EMPLOYER_EDITABLE_JOB_FIELDS},
        request=request,
    )
    await db.flush()
    return job


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


async def submit_job(
    db: AsyncSession,
    ctx: EmployerContext,
    job: Job,
    request: Request,
) -> Job:
    if job.status not in (JobStatus.DRAFT, JobStatus.REJECTED):
        raise EmployerError("Yalnız layihə və ya rədd edilmiş vakansiya yoxlamaya göndərilə bilər")

    job.status = JobStatus.PENDING_REVIEW
    job.moderation_reason = None
    job.moderation_note = None
    await _add_history(db, job, ctx.user, JobStatus.PENDING_REVIEW.value)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.job.submitted",
        entity_type="job",
        entity_id=job.id,
        after={"status": job.status.value},
        request=request,
    )
    await db.flush()
    return job


async def pause_job(
    db: AsyncSession,
    ctx: EmployerContext,
    job: Job,
    request: Request,
) -> Job:
    if job.status not in (JobStatus.PUBLISHED, JobStatus.APPROVED, JobStatus.PENDING_REVIEW):
        raise EmployerError("Bu vakansiya dayandırıla bilməz (yayımlanmayıb)")

    job.status = JobStatus.PAUSED
    await _add_history(db, job, ctx.user, JobStatus.PAUSED.value)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.job.paused",
        entity_type="job",
        entity_id=job.id,
        after={"status": job.status.value},
        request=request,
    )
    await db.flush()
    return job


async def archive_job(
    db: AsyncSession,
    ctx: EmployerContext,
    job: Job,
    request: Request,
) -> Job:
    if job.status == JobStatus.ARCHIVED:
        raise EmployerError("Vakansiya artıq arxivləşdirilib")

    job.status = JobStatus.ARCHIVED
    await _add_history(db, job, ctx.user, JobStatus.ARCHIVED.value)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.job.archived",
        entity_type="job",
        entity_id=job.id,
        after={"status": job.status.value},
        request=request,
    )
    await db.flush()
    return job


# ---------- Applications ----------

def _application_to_out(app: Application) -> ApplicationOut:
    candidate = app.candidate
    return ApplicationOut(
        id=app.id,
        job_id=app.job_id,
        job_title=app.job.title if app.job else None,
        candidate_id=app.candidate_id,
        candidate_name=candidate.full_name if candidate else None,
        candidate_email=candidate.email if candidate else None,
        cover_letter=app.cover_letter,
        status=app.status.value,
        applied_at=app.applied_at,
        created_at=app.created_at,
    )


async def list_applications(
    db: AsyncSession,
    ctx: EmployerContext,
    job_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "applied_desc",
    page: int = 1,
    limit: int = 20,
) -> tuple[list[ApplicationOut], int]:
    stmt = (
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.candidate_id == User.id)
        .options(selectinload(Application.job), selectinload(Application.candidate))
        .where(Job.company_id == ctx.company.id)
    )
    conditions = []
    if job_id:
        conditions.append(Application.job_id == job_id)
    if status_filter:
        try:
            conditions.append(Application.status == ApplicationStatus(status_filter))
        except ValueError:
            raise EmployerError(f"Bilinməyən status: {status_filter}")
    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(
            or_(
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
                Job.title.ilike(pattern),
            )
        )
    if conditions:
        stmt = stmt.where(*conditions)

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Application.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    order_map = {
        "applied_desc": Application.applied_at.desc(),
        "applied_asc": Application.applied_at.asc(),
        "status_asc": Application.status.asc(),
        "status_desc": Application.status.desc(),
    }
    stmt = stmt.order_by(order_map.get(sort, order_map["applied_desc"]))

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    apps = list(result.scalars().unique())
    return [_application_to_out(a) for a in apps], total


async def get_application_or_404(
    db: AsyncSession, ctx: EmployerContext, application_id: UUID
) -> Application:
    result = await db.execute(
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .options(selectinload(Application.job), selectinload(Application.candidate))
        .where(Application.id == application_id, Job.company_id == ctx.company.id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise EmployerError("Müraciət tapılmadı", 404)
    return app


async def update_application_status(
    db: AsyncSession,
    ctx: EmployerContext,
    app: Application,
    new_status: str,
    request: Request,
    note: Optional[str] = None,
) -> Application:
    current = app.status.value
    allowed = APPLICATION_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise EmployerError(
            f"Müraciət statusu '{current}' vəziyyətindən '{new_status}' vəziyyətinə keçirilə bilməz",
            409,
        )

    before = {"status": app.status.value}
    app.status = ApplicationStatus(new_status)
    app.updated_at = utcnow()

    history = ApplicationHistory(
        application_id=app.id,
        from_status=before["status"],
        to_status=new_status,
        changed_by_role="EMPLOYER",
        changed_by_id=ctx.user.id,
        note=note,
    )
    db.add(history)

    await record_audit(
        db,
        actor=ctx.user,
        action="employer.application.status_changed",
        entity_type="application",
        entity_id=app.id,
        before=before,
        after={"status": app.status.value},
        request=request,
    )
    await db.flush()

    # Notify the candidate about the status change (same transaction)
    job_title = app.job.title if app.job else "Vakansiya"
    status_labels = {
        "SHORTLISTED": "müsahibəyə namizəd seçildi",
        "REJECTED": "rədd edildi",
        "HIRED": "işə qəbul edildi",
    }
    await create_notification(
        db,
        user_id=app.candidate_id,
        type=NotificationType.APPLICATION_STATUS,
        title="Müraciətinizin statusu yeniləndi",
        message=f"'{job_title}' vakansiyasına müraciətiniz {status_labels.get(new_status, new_status.lower())}.",
        entity_type="application",
        entity_id=app.id,
        action_url="/candidate/applications",
    )
    return app
