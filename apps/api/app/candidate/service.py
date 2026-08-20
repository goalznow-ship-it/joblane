"""
Business logic for the candidate portal.

Every operation is scoped to the authenticated candidate's own data.
SQLAlchemy AsyncSession is used with explicit selects and selectinload
options; lazy loads are never relied on for response construction.
"""

import io
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.models import (
    Application,
    ApplicationStatus,
    Company,
    CompanyMembership,
    CompanyMembershipStatus,
    CompanyStatus,
    Job,
    JobStatus,
)
from app.admin.audit import record_audit
from app.auth.models import User
from app.candidate.models import (
    ApplicationHistory,
    CandidateEducation,
    CandidateExperience,
    CandidateProfile,
    CandidateResume,
    SavedJob,
)
from app.candidate.schemas import (
    CandidateApplicationDetailOut,
    CandidateApplicationOut,
    CandidateMeResponse,
    EducationOut,
    ExperienceOut,
    ProfileOut,
    ResumeOut,
    SavedJobOut,
)


class CandidateError(Exception):
    def __init__(self, detail: str, code: int = 400):
        self.detail = detail
        self.code = code


def utcnow():
    return datetime.now(timezone.utc)


PROFILE_EDITABLE_FIELDS = {
    "headline",
    "summary",
    "phone",
    "location",
    "website",
    "linkedin_url",
    "github_url",
    "skills",
    "experience_years",
    "is_public",
}

WITHDRAWABLE_STATUSES = {
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.VIEWED,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
}

PUBLIC_COMPANY_STATUSES = (CompanyStatus.VERIFIED, CompanyStatus.ACTIVE)


# ---------- Profile ----------

async def get_profile_or_404(db: AsyncSession, user: User) -> CandidateProfile:
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise CandidateError("Namizəd profili yaradılmayıb", 404)
    return profile


async def get_or_create_profile(db: AsyncSession, user: User) -> CandidateProfile:
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    return profile


def _profile_to_out(profile: CandidateProfile) -> ProfileOut:
    return ProfileOut(
        id=profile.id,
        headline=profile.headline,
        summary=profile.summary,
        phone=profile.phone,
        location=profile.location,
        website=profile.website,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        skills=profile.skills or [],
        experience_years=profile.experience_years,
        is_public=profile.is_public,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


async def update_profile(
    db: AsyncSession,
    user: User,
    payload: dict,
    request: Request,
) -> CandidateProfile:
    profile = await get_or_create_profile(db, user)
    if not payload:
        raise CandidateError("Yenilənəcək sahə yoxdur")

    before = {k: getattr(profile, k) for k in PROFILE_EDITABLE_FIELDS}
    for field, value in payload.items():
        if field not in PROFILE_EDITABLE_FIELDS:
            raise CandidateError(f"Bu sahə redaktə edilə bilməz: {field}")
        setattr(profile, field, value)

    await record_audit(
        db,
        actor=user,
        action="candidate.profile.updated",
        entity_type="candidate_profile",
        entity_id=profile.id,
        before=before,
        after={k: getattr(profile, k) for k in PROFILE_EDITABLE_FIELDS},
        request=request,
    )
    await db.flush()
    return profile


# ---------- Me ----------

def _experience_to_out(item: CandidateExperience) -> ExperienceOut:
    return ExperienceOut(
        id=item.id,
        title=item.title,
        company_name=item.company_name,
        location=item.location,
        start_date=item.start_date,
        end_date=item.end_date,
        is_current=item.is_current,
        description=item.description,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _education_to_out(item: CandidateEducation) -> EducationOut:
    return EducationOut(
        id=item.id,
        institution=item.institution,
        degree=item.degree,
        field_of_study=item.field_of_study,
        start_date=item.start_date,
        end_date=item.end_date,
        is_current=item.is_current,
        description=item.description,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _resume_to_out(item: CandidateResume) -> ResumeOut:
    return ResumeOut(
        id=item.id,
        title=item.title,
        file_url=item.file_url,
        file_name=item.file_name,
        file_size=item.file_size,
        mime_type=item.mime_type,
        is_default=item.is_default,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


async def candidate_me(db: AsyncSession, user: User) -> CandidateMeResponse:
    result = await db.execute(
        select(CandidateProfile)
        .options(
            selectinload(CandidateProfile.experiences),
            selectinload(CandidateProfile.educations),
            selectinload(CandidateProfile.resumes),
        )
        .where(CandidateProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    saved_count = 0
    app_count = 0
    if profile:
        saved_result = await db.execute(
            select(func.count()).select_from(SavedJob).where(SavedJob.candidate_id == user.id)
        )
        saved_count = saved_result.scalar() or 0
    app_result = await db.execute(
        select(func.count()).select_from(Application).where(Application.candidate_id == user.id)
    )
    app_count = app_result.scalar() or 0

    return CandidateMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        email_verified=user.email_verified_at is not None,
        status=user.status.value,
        profile=_profile_to_out(profile) if profile else None,
        experiences=[_experience_to_out(e) for e in (profile.experiences if profile else [])],
        educations=[_education_to_out(e) for e in (profile.educations if profile else [])],
        resumes=[_resume_to_out(r) for r in (profile.resumes if profile else [])],
        saved_jobs_count=saved_count,
        applications_count=app_count,
    )


# ---------- Experience ----------

async def list_experiences(db: AsyncSession, user: User) -> list[ExperienceOut]:
    profile = await get_profile_or_404(db, user)
    result = await db.execute(
        select(CandidateExperience)
        .where(CandidateExperience.candidate_profile_id == profile.id)
        .order_by(CandidateExperience.start_date.desc().nullslast(), CandidateExperience.created_at.desc())
    )
    return [_experience_to_out(i) for i in result.scalars().all()]


async def _get_experience_or_404(db: AsyncSession, user: User, experience_id: UUID) -> CandidateExperience:
    profile = await get_profile_or_404(db, user)
    result = await db.execute(
        select(CandidateExperience).where(
            CandidateExperience.id == experience_id,
            CandidateExperience.candidate_profile_id == profile.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise CandidateError("Təcrübə tapılmadı", 404)
    return item


async def create_experience(
    db: AsyncSession, user: User, payload: dict, request: Request
) -> CandidateExperience:
    profile = await get_or_create_profile(db, user)
    item = CandidateExperience(candidate_profile_id=profile.id, **payload)
    db.add(item)
    await record_audit(
        db,
        actor=user,
        action="candidate.experience.created",
        entity_type="candidate_experience",
        entity_id=item.id,
        after=payload,
        request=request,
    )
    await db.flush()
    return item


async def update_experience(
    db: AsyncSession,
    user: User,
    experience_id: UUID,
    payload: dict,
    request: Request,
) -> CandidateExperience:
    item = await _get_experience_or_404(db, user, experience_id)
    if not payload:
        raise CandidateError("Yenilənəcək sahə yoxdur")
    for field, value in payload.items():
        setattr(item, field, value)
    await record_audit(
        db,
        actor=user,
        action="candidate.experience.updated",
        entity_type="candidate_experience",
        entity_id=item.id,
        after=payload,
        request=request,
    )
    await db.flush()
    return item


async def delete_experience(
    db: AsyncSession, user: User, experience_id: UUID, request: Request
) -> None:
    item = await _get_experience_or_404(db, user, experience_id)
    await record_audit(
        db,
        actor=user,
        action="candidate.experience.deleted",
        entity_type="candidate_experience",
        entity_id=item.id,
        request=request,
    )
    await db.delete(item)
    await db.flush()


# ---------- Education ----------

async def list_educations(db: AsyncSession, user: User) -> list[EducationOut]:
    profile = await get_profile_or_404(db, user)
    result = await db.execute(
        select(CandidateEducation)
        .where(CandidateEducation.candidate_profile_id == profile.id)
        .order_by(CandidateEducation.start_date.desc().nullslast(), CandidateEducation.created_at.desc())
    )
    return [_education_to_out(i) for i in result.scalars().all()]


async def _get_education_or_404(db: AsyncSession, user: User, education_id: UUID) -> CandidateEducation:
    profile = await get_profile_or_404(db, user)
    result = await db.execute(
        select(CandidateEducation).where(
            CandidateEducation.id == education_id,
            CandidateEducation.candidate_profile_id == profile.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise CandidateError("Təhsil tapılmadı", 404)
    return item


async def create_education(
    db: AsyncSession, user: User, payload: dict, request: Request
) -> CandidateEducation:
    profile = await get_or_create_profile(db, user)
    item = CandidateEducation(candidate_profile_id=profile.id, **payload)
    db.add(item)
    await record_audit(
        db,
        actor=user,
        action="candidate.education.created",
        entity_type="candidate_education",
        entity_id=item.id,
        after=payload,
        request=request,
    )
    await db.flush()
    return item


async def update_education(
    db: AsyncSession,
    user: User,
    education_id: UUID,
    payload: dict,
    request: Request,
) -> CandidateEducation:
    item = await _get_education_or_404(db, user, education_id)
    if not payload:
        raise CandidateError("Yenilənəcək sahə yoxdur")
    for field, value in payload.items():
        setattr(item, field, value)
    await record_audit(
        db,
        actor=user,
        action="candidate.education.updated",
        entity_type="candidate_education",
        entity_id=item.id,
        after=payload,
        request=request,
    )
    await db.flush()
    return item


async def delete_education(
    db: AsyncSession, user: User, education_id: UUID, request: Request
) -> None:
    item = await _get_education_or_404(db, user, education_id)
    await record_audit(
        db,
        actor=user,
        action="candidate.education.deleted",
        entity_type="candidate_education",
        entity_id=item.id,
        request=request,
    )
    await db.delete(item)
    await db.flush()


# ---------- Resumes ----------

async def list_resumes(db: AsyncSession, user: User) -> list[ResumeOut]:
    profile = await get_profile_or_404(db, user)
    result = await db.execute(
        select(CandidateResume)
        .where(CandidateResume.candidate_profile_id == profile.id)
        .order_by(CandidateResume.is_default.desc(), CandidateResume.created_at.desc())
    )
    return [_resume_to_out(i) for i in result.scalars().all()]


async def _get_resume_or_404(db: AsyncSession, user: User, resume_id: UUID) -> CandidateResume:
    profile = await get_profile_or_404(db, user)
    result = await db.execute(
        select(CandidateResume).where(
            CandidateResume.id == resume_id,
            CandidateResume.candidate_profile_id == profile.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise CandidateError("CV tapılmadı", 404)
    return item


async def create_resume(
    db: AsyncSession,
    user: User,
    title: str,
    file_url: str,
    file_name: Optional[str],
    file_size: Optional[int],
    mime_type: Optional[str],
    is_default: bool,
    request: Request,
) -> CandidateResume:
    profile = await get_or_create_profile(db, user)
    if is_default:
        await db.execute(
            CandidateResume.__table__.update()
            .where(CandidateResume.candidate_profile_id == profile.id)
            .values(is_default=False)
        )
    item = CandidateResume(
        candidate_profile_id=profile.id,
        title=title,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
        is_default=is_default,
    )
    db.add(item)
    await record_audit(
        db,
        actor=user,
        action="candidate.resume.uploaded",
        entity_type="candidate_resume",
        entity_id=item.id,
        after={"title": title, "file_name": file_name, "is_default": is_default},
        request=request,
    )
    await db.flush()
    return item


async def update_resume(
    db: AsyncSession,
    user: User,
    resume_id: UUID,
    payload: dict,
    request: Request,
) -> CandidateResume:
    item = await _get_resume_or_404(db, user, resume_id)
    if not payload:
        raise CandidateError("Yenilənəcək sahə yoxdur")

    new_default = payload.get("is_default")
    if new_default is True:
        await db.execute(
            CandidateResume.__table__.update()
            .where(CandidateResume.candidate_profile_id == item.candidate_profile_id)
            .values(is_default=False)
        )
        item.is_default = True
        payload.pop("is_default", None)
    for field, value in payload.items():
        setattr(item, field, value)

    await record_audit(
        db,
        actor=user,
        action="candidate.resume.updated",
        entity_type="candidate_resume",
        entity_id=item.id,
        after=payload,
        request=request,
    )
    await db.flush()
    return item


async def delete_resume(
    db: AsyncSession, user: User, resume_id: UUID, request: Request
) -> None:
    item = await _get_resume_or_404(db, user, resume_id)
    await record_audit(
        db,
        actor=user,
        action="candidate.resume.deleted",
        entity_type="candidate_resume",
        entity_id=item.id,
        request=request,
    )
    await db.delete(item)
    await db.flush()


# ---------- Saved jobs ----------

def _saved_job_to_out(row: SavedJob) -> SavedJobOut:
    job = row.job
    return SavedJobOut(
        id=row.id,
        job_id=job.id,
        job_title=job.title,
        job_slug=job.slug,
        company_name=job.company.name,
        company_slug=job.company.slug,
        location=job.location,
        salary_min=float(job.salary_min) if job.salary_min is not None else None,
        salary_max=float(job.salary_max) if job.salary_max is not None else None,
        salary_currency=job.salary_currency,
        employment_type=job.employment_type.value if job.employment_type else None,
        work_mode=job.work_mode.value if job.work_mode else None,
        is_premium=job.is_premium,
        is_featured=job.is_featured,
        is_urgent=job.is_urgent,
        saved_at=row.created_at,
    )


async def list_saved_jobs(
    db: AsyncSession,
    user: User,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[SavedJobOut], int]:
    stmt = (
        select(SavedJob)
        .options(
            selectinload(SavedJob.job).selectinload(Job.company),
        )
        .where(SavedJob.candidate_id == user.id)
    )
    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(SavedJob.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    result = await db.execute(
        stmt.order_by(SavedJob.created_at.desc())
        .offset((max(1, page) - 1) * min(max(1, limit), 100))
        .limit(min(max(1, limit), 100))
    )
    rows = list(result.scalars().unique())
    return [_saved_job_to_out(r) for r in rows], total


async def _get_public_job_or_404(db: AsyncSession, job_id: UUID) -> Job:
    result = await db.execute(
        select(Job)
        .options(selectinload(Job.company))
        .where(Job.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise CandidateError("Vakansiya tapılmadı", 404)
    return job


async def save_job(
    db: AsyncSession, user: User, job_id: UUID, request: Request
) -> SavedJob:
    job = await _get_public_job_or_404(db, job_id)
    _validate_public_job(job)

    existing = await db.execute(
        select(SavedJob.id).where(
            SavedJob.candidate_id == user.id,
            SavedJob.job_id == job_id,
        )
    )
    if existing.scalar_one_or_none():
        raise CandidateError("Vakansiya artıq saxlanılıb", 409)

    row = SavedJob(candidate_id=user.id, job_id=job_id)
    db.add(row)
    job.favorites_count = (job.favorites_count or 0) + 1
    await record_audit(
        db,
        actor=user,
        action="candidate.job.saved",
        entity_type="saved_job",
        entity_id=row.id,
        after={"job_id": str(job_id)},
        request=request,
    )
    await db.flush()
    return row


async def unsave_job(
    db: AsyncSession, user: User, job_id: UUID, request: Request
) -> None:
    result = await db.execute(
        select(SavedJob).where(
            SavedJob.candidate_id == user.id,
            SavedJob.job_id == job_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise CandidateError("Saxlanılmış vakansiya tapılmadı", 404)
    job = await db.get(Job, job_id)
    if job:
        job.favorites_count = max(0, (job.favorites_count or 0) - 1)
    await record_audit(
        db,
        actor=user,
        action="candidate.job.unsaved",
        entity_type="saved_job",
        entity_id=row.id,
        after={"job_id": str(job_id)},
        request=request,
    )
    await db.delete(row)
    await db.flush()


# ---------- Applications ----------

def _validate_public_job(job: Job) -> None:
    now = utcnow()
    if job.status != JobStatus.PUBLISHED:
        raise CandidateError("Bu vakansiyaya müraciət etmək mümkün deyil", 400)
    if job.company.status not in PUBLIC_COMPANY_STATUSES:
        raise CandidateError("Bu vakansiyaya müraciət etmək mümkün deyil", 400)
    if job.expiration_date is not None and job.expiration_date < now:
        raise CandidateError("Vakansiyanın qəbul müddəti bitib", 400)
    if job.application_deadline is not None and job.application_deadline < now:
        raise CandidateError("Vakansiyanın qəbul müddəti bitib", 400)


async def apply_to_job(
    db: AsyncSession,
    user: User,
    job_id: UUID,
    resume_id: Optional[UUID],
    cover_letter: Optional[str],
    request: Request,
) -> Application:
    job = await _get_public_job_or_404(db, job_id)
    _validate_public_job(job)

    existing = await db.execute(
        select(Application.id).where(
            Application.candidate_id == user.id,
            Application.job_id == job_id,
        )
    )
    if existing.scalar_one_or_none():
        raise CandidateError("Bu vakansiyaya artıq müraciət etmisiniz", 409)

    membership = await db.execute(
        select(CompanyMembership.id).where(
            CompanyMembership.user_id == user.id,
            CompanyMembership.company_id == job.company_id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    if membership.scalar_one_or_none():
        raise CandidateError("Öz şirkətinizin vakansiyasına müraciət edə bilməzsiniz", 400)

    resolved_resume_id = None
    if resume_id:
        resume = await _get_resume_or_404(db, user, resume_id)
        resolved_resume_id = resume.id

    application = Application(
        job_id=job_id,
        candidate_id=user.id,
        status=ApplicationStatus.SUBMITTED,
        cover_letter=cover_letter,
        resume_id=resolved_resume_id,
    )
    db.add(application)
    await db.flush()

    history = ApplicationHistory(
        application_id=application.id,
        from_status=None,
        to_status=ApplicationStatus.SUBMITTED.value,
        changed_by_role="CANDIDATE",
        changed_by_id=user.id,
    )
    db.add(history)

    job.applications_count = (job.applications_count or 0) + 1

    await record_audit(
        db,
        actor=user,
        action="candidate.application.created",
        entity_type="application",
        entity_id=application.id,
        after={
            "job_id": str(job_id),
            "resume_id": str(resolved_resume_id) if resolved_resume_id else None,
        },
        request=request,
    )
    await db.flush()
    return application


def _application_to_out(app: Application) -> CandidateApplicationOut:
    job = app.job
    return CandidateApplicationOut(
        id=app.id,
        job_id=app.job_id,
        job_title=job.title,
        job_slug=job.slug,
        company_name=job.company.name,
        company_slug=job.company.slug,
        job_status=job.status.value,
        location=job.location,
        employment_type=job.employment_type.value if job.employment_type else None,
        work_mode=job.work_mode.value if job.work_mode else None,
        application_deadline=job.application_deadline,
        resume_id=app.resume_id,
        resume_title=app.resume.title if app.resume else None,
        cover_letter=app.cover_letter,
        status=app.status.value,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
    )


async def list_applications(
    db: AsyncSession,
    user: User,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[CandidateApplicationOut], int]:
    stmt = (
        select(Application)
        .options(
            selectinload(Application.job).selectinload(Job.company),
            selectinload(Application.resume),
        )
        .where(Application.candidate_id == user.id)
    )
    if status_filter:
        try:
            stmt = stmt.where(Application.status == ApplicationStatus(status_filter))
        except ValueError:
            raise CandidateError(f"Bilinməyən status: {status_filter}")

    count_stmt = select(func.count()).select_from(
        stmt.with_only_columns(Application.id).order_by(None).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    page = max(1, page)
    limit = min(max(1, limit), 100)
    result = await db.execute(
        stmt.order_by(Application.applied_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    apps = list(result.scalars().unique())
    return [_application_to_out(a) for a in apps], total


async def _get_application_or_404(
    db: AsyncSession, user: User, application_id: UUID
) -> Application:
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.job).selectinload(Job.company),
            selectinload(Application.resume),
            selectinload(Application.history),
        )
        .where(
            Application.id == application_id,
            Application.candidate_id == user.id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise CandidateError("Müraciət tapılmadı", 404)
    return app


async def get_application_detail(
    db: AsyncSession, user: User, application_id: UUID
) -> CandidateApplicationDetailOut:
    app = await _get_application_or_404(db, user, application_id)
    out = _application_to_out(app)
    return CandidateApplicationDetailOut(
        **out.model_dump(),
        history=[
            {
                "id": h.id,
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_by_role": h.changed_by_role,
                "changed_by_id": h.changed_by_id,
                "note": h.note,
                "created_at": h.created_at,
            }
            for h in (app.history or [])
        ],
    )


async def withdraw_application(
    db: AsyncSession, user: User, application_id: UUID, request: Request
) -> Application:
    app = await _get_application_or_404(db, user, application_id)
    if app.status not in WITHDRAWABLE_STATUSES:
        raise CandidateError(
            f"'{app.status.value}' vəziyyətində olan müraciət geriyə çəkilə bilməz",
            409,
        )

    before = {"status": app.status.value}
    app.status = ApplicationStatus.WITHDRAWN
    app.updated_at = utcnow()

    history = ApplicationHistory(
        application_id=app.id,
        from_status=before["status"],
        to_status=ApplicationStatus.WITHDRAWN.value,
        changed_by_role="CANDIDATE",
        changed_by_id=user.id,
    )
    db.add(history)

    job = await db.get(Job, app.job_id)
    if job:
        job.applications_count = max(0, (job.applications_count or 0) - 1)

    await record_audit(
        db,
        actor=user,
        action="candidate.application.withdrawn",
        entity_type="application",
        entity_id=app.id,
        before=before,
        after={"status": app.status.value},
        request=request,
    )
    await db.flush()
    return app