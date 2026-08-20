"""
Pydantic schemas for the candidate portal API.

All request models validate on the API boundary; business rules live in
service.py.
"""

from datetime import datetime, date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class ExperienceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    company_name: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ExperienceCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=2, max_length=255)
    company_name: Optional[str] = Field(default=None, max_length=255)
    location: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None


class ExperienceUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    company_name: Optional[str] = Field(default=None, max_length=255)
    location: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None


class EducationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EducationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institution: str = Field(..., min_length=2, max_length=255)
    degree: Optional[str] = Field(default=None, max_length=255)
    field_of_study: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None


class EducationUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institution: Optional[str] = Field(default=None, min_length=2, max_length=255)
    degree: Optional[str] = Field(default=None, max_length=255)
    field_of_study: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    file_url: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    is_default: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


class ResumeUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    is_default: Optional[bool] = None


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    headline: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    is_public: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    headline: Optional[str] = Field(default=None, max_length=255)
    summary: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=64)
    location: Optional[str] = Field(default=None, max_length=255)
    website: Optional[str] = Field(default=None, max_length=255)
    linkedin_url: Optional[str] = Field(default=None, max_length=255)
    github_url: Optional[str] = Field(default=None, max_length=255)
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=70)
    is_public: Optional[bool] = None


class CandidateMeResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    email_verified: bool
    status: str
    profile: Optional[ProfileOut] = None
    experiences: List[ExperienceOut] = []
    educations: List[EducationOut] = []
    resumes: List[ResumeOut] = []
    saved_jobs_count: int = 0
    applications_count: int = 0


class SavedJobOut(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str
    job_slug: str
    company_name: str
    company_slug: str
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    is_premium: bool = False
    is_featured: bool = False
    is_urgent: bool = False
    saved_at: datetime


class SavedJobListResponse(BaseModel):
    items: List[SavedJobOut]
    total: int
    page: int
    limit: int


class ApplyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: UUID
    resume_id: Optional[UUID] = None
    cover_letter: Optional[str] = Field(default=None, max_length=5000)


class ApplicationHistoryOut(BaseModel):
    id: UUID
    from_status: Optional[str] = None
    to_status: str
    changed_by_role: str
    changed_by_id: Optional[UUID] = None
    note: Optional[str] = None
    created_at: datetime


class CandidateApplicationOut(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str
    job_slug: str
    company_name: str
    company_slug: str
    job_status: str
    location: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    application_deadline: Optional[datetime] = None
    resume_id: Optional[UUID] = None
    resume_title: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    applied_at: datetime
    updated_at: Optional[datetime] = None


class CandidateApplicationDetailOut(CandidateApplicationOut):
    history: List[ApplicationHistoryOut] = []


class CandidateApplicationListResponse(BaseModel):
    items: List[CandidateApplicationOut]
    total: int
    page: int
    limit: int


class WithdrawResponse(BaseModel):
    id: UUID
    status: str


class UploadResponse(BaseModel):
    url: str


CandidateMeResponse.model_rebuild()