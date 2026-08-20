"""
Pydantic schemas for the employer portal API.

All request models validate on the API boundary; business rules live in
service.py.
"""

from datetime import datetime
from typing import List, Optional, Literal, Dict
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    company_name: str
    company_status: str
    role: str
    status: str


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    socials: Optional[dict] = None
    industry_id: Optional[UUID] = None
    industry_name: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    status: str
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    active_jobs_count: int = 0
    total_jobs_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None


class EmployerMeResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    email_verified: bool
    status: str
    memberships: List[MembershipOut]
    current_company: Optional[CompanyOut] = None


class CompanyCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=2, max_length=255)
    slug: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    socials: Optional[Dict[str, str]] = None
    industry_id: Optional[UUID] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None


class CompanyUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    socials: Optional[Dict[str, str]] = None
    industry_id: Optional[UUID] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None


class DashboardResponse(BaseModel):
    company: CompanyOut
    jobs_total: int
    jobs_draft: int
    jobs_pending_review: int
    jobs_published: int
    jobs_paused: int
    jobs_rejected: int
    jobs_archived: int
    applications_total: int
    applications_new: int
    applications_shortlisted: int
    applications_interview: int
    applications_hired: int
    total_views: int
    recent_applications: List["ApplicationOut"] = []


class JobCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = Field(default="AZN", max_length=3)
    salary_period: str = Field(default="MONTH", max_length=20)
    salary_visible: bool = True
    location: Optional[str] = None
    region_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    industry: Optional[str] = Field(default=None, max_length=100)
    employment_type: Literal["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP", "TEMPORARY", "SEASONAL"]
    work_mode: Optional[Literal["ON_SITE", "REMOTE", "HYBRID"]] = None
    experience_level: Optional[str] = Field(default=None, max_length=50)
    education: Optional[str] = None
    application_deadline: Optional[datetime] = None


class JobUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(default=None, min_length=3, max_length=255)
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = Field(default=None, max_length=3)
    salary_period: Optional[str] = Field(default=None, max_length=20)
    salary_visible: Optional[bool] = None
    location: Optional[str] = None
    region_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    industry: Optional[str] = Field(default=None, max_length=100)
    employment_type: Optional[Literal["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP", "TEMPORARY", "SEASONAL"]] = None
    work_mode: Optional[Literal["ON_SITE", "REMOTE", "HYBRID"]] = None
    experience_level: Optional[str] = Field(default=None, max_length=50)
    education: Optional[str] = None
    application_deadline: Optional[datetime] = None


class JobStatusActionRequest(BaseModel):
    action: Literal["submit", "pause", "archive"]
    note: Optional[str] = None


class ModerationHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_status: Optional[str] = None
    to_status: str
    actor_id: Optional[UUID] = None
    actor_email: Optional[str] = None
    reason: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime


class EmployerJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    salary_visible: Optional[bool] = None
    location: Optional[str] = None
    region_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    industry: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    experience_level: Optional[str] = None
    education: Optional[str] = None
    application_deadline: Optional[datetime] = None
    status: str
    moderation_reason: Optional[str] = None
    moderation_note: Optional[str] = None
    publication_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    is_premium: bool = False
    is_featured: bool = False
    is_urgent: bool = False
    views: int = 0
    applications_count: int = 0
    favorites_count: int = 0
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EmployerJobDetailOut(EmployerJobOut):
    moderation_history: List[ModerationHistoryOut] = []


class JobListResponse(BaseModel):
    items: List[EmployerJobOut]
    total: int
    page: int
    limit: int


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    job_title: str
    candidate_id: UUID
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    applied_at: datetime
    created_at: datetime


class ApplicationListResponse(BaseModel):
    items: List[ApplicationOut]
    total: int
    page: int
    limit: int


class ApplicationStatusUpdateRequest(BaseModel):
    status: Literal["SUBMITTED", "VIEWED", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED", "WITHDRAWN"]
    note: Optional[str] = None


class UploadResponse(BaseModel):
    url: str


DashboardResponse.model_rebuild()
EmployerJobDetailOut.model_rebuild()