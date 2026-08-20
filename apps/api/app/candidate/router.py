"""
Candidate portal API router.

Endpoints live under /api/v1/candidate, are protected by session + CSRF
authentication and are scoped to the caller's own candidate data. The same
User account can act as candidate, employer or admin; the candidate domain
never changes User.role.
"""

from typing import Annotated, Optional
from uuid import UUID
import io

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import csrf_protection, get_current_user
from app.auth.models import User
from app.core.storage import get_storage_provider, generate_object_name
from app.core.config import settings
from app.candidate import service
from app.candidate.schemas import (
    ApplyRequest,
    CandidateApplicationDetailOut,
    CandidateApplicationListResponse,
    CandidateApplicationOut,
    CandidateMeResponse,
    EducationCreateRequest,
    EducationOut,
    EducationUpdateRequest,
    ExperienceCreateRequest,
    ExperienceOut,
    ExperienceUpdateRequest,
    ProfileOut,
    ProfileUpdateRequest,
    ResumeOut,
    ResumeUpdateRequest,
    SavedJobListResponse,
    UploadResponse,
    WithdrawResponse,
)

router = APIRouter(prefix="/api/v1/candidate", tags=["candidate"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def get_candidate_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.status.value != "ACTIVE":
        raise HTTPException(status_code=403, detail="Hesab aktiv deyil")
    return user


def _to_http(e: service.CandidateError) -> HTTPException:
    return HTTPException(status_code=e.code, detail=e.detail)


async def _upload_resume_file(file: UploadFile, owner_id: UUID) -> tuple[str, int]:
    allowed_types = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Yalnız PDF və DOC/DOCX formatları dəstəklənir",
        )

    max_size = 5 * 1024 * 1024  # 5MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Fayl ölçüsü 5MB-dan çox ola bilməz",
        )
    file.file.seek(0)

    ext = file.filename.split(".")[-1].lower() if file.filename else "pdf"
    object_name = await generate_object_name(f"resumes/{owner_id}", ext)

    storage = await get_storage_provider()
    await storage.upload(
        bucket_name=settings.s3_bucket,
        object_name=object_name,
        data=io.BytesIO(content),
        content_type=file.content_type,
    )

    if settings.s3_endpoint and "minio" in settings.s3_endpoint:
        return f"{settings.s3_endpoint}/{settings.s3_bucket}/{object_name}", len(content)
    return f"/storage/{settings.s3_bucket}/{object_name}", len(content)


# ---------- Me ----------

@router.get("/me", response_model=CandidateMeResponse)
async def candidate_me(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
) -> CandidateMeResponse:
    return await service.candidate_me(db, user)


# ---------- Profile ----------

@router.get("/profile", response_model=ProfileOut)
async def get_profile(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
) -> ProfileOut:
    try:
        profile = await service.get_profile_or_404(db, user)
    except service.CandidateError as e:
        raise _to_http(e)
    return service._profile_to_out(profile)


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    data: ProfileUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> ProfileOut:
    profile = await service.update_profile(db, user, data.model_dump(exclude_unset=True), request)
    await db.commit()
    return service._profile_to_out(profile)


# ---------- Experience ----------

@router.get("/experience", response_model=list[ExperienceOut])
async def list_experiences(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
) -> list[ExperienceOut]:
    return await service.list_experiences(db, user)


@router.post("/experience", response_model=ExperienceOut, status_code=201)
async def create_experience(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    data: ExperienceCreateRequest,
    _: bool = Depends(csrf_protection),
) -> ExperienceOut:
    item = await service.create_experience(db, user, data.model_dump(), request)
    await db.commit()
    return service._experience_to_out(item)


@router.patch("/experience/{experience_id}", response_model=ExperienceOut)
async def update_experience(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    experience_id: UUID,
    data: ExperienceUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> ExperienceOut:
    try:
        item = await service.update_experience(
            db, user, experience_id, data.model_dump(exclude_unset=True), request
        )
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()
    return service._experience_to_out(item)


@router.delete("/experience/{experience_id}", status_code=204)
async def delete_experience(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    experience_id: UUID,
    _: bool = Depends(csrf_protection),
) -> None:
    try:
        await service.delete_experience(db, user, experience_id, request)
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()


# ---------- Education ----------

@router.get("/education", response_model=list[EducationOut])
async def list_educations(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
) -> list[EducationOut]:
    return await service.list_educations(db, user)


@router.post("/education", response_model=EducationOut, status_code=201)
async def create_education(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    data: EducationCreateRequest,
    _: bool = Depends(csrf_protection),
) -> EducationOut:
    item = await service.create_education(db, user, data.model_dump(), request)
    await db.commit()
    return service._education_to_out(item)


@router.patch("/education/{education_id}", response_model=EducationOut)
async def update_education(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    education_id: UUID,
    data: EducationUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> EducationOut:
    try:
        item = await service.update_education(
            db, user, education_id, data.model_dump(exclude_unset=True), request
        )
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()
    return service._education_to_out(item)


@router.delete("/education/{education_id}", status_code=204)
async def delete_education(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    education_id: UUID,
    _: bool = Depends(csrf_protection),
) -> None:
    try:
        await service.delete_education(db, user, education_id, request)
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()


# ---------- Resumes ----------

@router.get("/resumes", response_model=list[ResumeOut])
async def list_resumes(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
) -> list[ResumeOut]:
    return await service.list_resumes(db, user)


@router.post("/resumes", response_model=ResumeOut, status_code=201)
async def upload_resume(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    is_default: bool = Form(default=False),
    _: bool = Depends(csrf_protection),
) -> ResumeOut:
    url, size = await _upload_resume_file(file, user.id)
    item = await service.create_resume(
        db,
        user,
        title=title or (file.filename or "CV"),
        file_url=url,
        file_name=file.filename,
        file_size=size,
        mime_type=file.content_type,
        is_default=is_default,
        request=request,
    )
    await db.commit()
    return service._resume_to_out(item)


@router.patch("/resumes/{resume_id}", response_model=ResumeOut)
async def update_resume(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    resume_id: UUID,
    data: ResumeUpdateRequest,
    _: bool = Depends(csrf_protection),
) -> ResumeOut:
    try:
        item = await service.update_resume(
            db, user, resume_id, data.model_dump(exclude_unset=True), request
        )
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()
    return service._resume_to_out(item)


@router.delete("/resumes/{resume_id}", status_code=204)
async def delete_resume(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    resume_id: UUID,
    _: bool = Depends(csrf_protection),
) -> None:
    try:
        await service.delete_resume(db, user, resume_id, request)
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()


# ---------- Saved jobs ----------

@router.get("/saved", response_model=SavedJobListResponse)
async def list_saved_jobs(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> SavedJobListResponse:
    items, total = await service.list_saved_jobs(db, user, page=page, limit=limit)
    return SavedJobListResponse(items=items, total=total, page=page, limit=limit)


@router.post("/saved/{job_id}", status_code=201)
async def save_job(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    job_id: UUID,
    _: bool = Depends(csrf_protection),
) -> dict:
    try:
        await service.save_job(db, user, job_id, request)
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()
    return {"saved": True}


@router.delete("/saved/{job_id}", status_code=204)
async def unsave_job(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    job_id: UUID,
    _: bool = Depends(csrf_protection),
) -> None:
    try:
        await service.unsave_job(db, user, job_id, request)
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()


# ---------- Applications ----------

@router.post("/applications", response_model=CandidateApplicationOut, status_code=201)
async def apply_to_job(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    data: ApplyRequest,
    _: bool = Depends(csrf_protection),
) -> CandidateApplicationOut:
    try:
        app = await service.apply_to_job(
            db, user, data.job_id, data.resume_id, data.cover_letter, request
        )
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()
    loaded = await service._get_application_or_404(db, user, app.id)
    return service._application_to_out(loaded)


@router.get("/applications", response_model=CandidateApplicationListResponse)
async def list_applications(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> CandidateApplicationListResponse:
    items, total = await service.list_applications(db, user, status_filter=status, page=page, limit=limit)
    return CandidateApplicationListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/applications/{application_id}", response_model=CandidateApplicationDetailOut)
async def get_application(
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    application_id: UUID,
) -> CandidateApplicationDetailOut:
    try:
        return await service.get_application_detail(db, user, application_id)
    except service.CandidateError as e:
        raise _to_http(e)


@router.post("/applications/{application_id}/withdraw", response_model=WithdrawResponse)
async def withdraw_application(
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_candidate_user)],
    application_id: UUID,
    _: bool = Depends(csrf_protection),
) -> WithdrawResponse:
    try:
        app = await service.withdraw_application(db, user, application_id, request)
    except service.CandidateError as e:
        raise _to_http(e)
    await db.commit()
    return WithdrawResponse(id=app.id, status=app.status.value)