"""
Pydantic schemas for the Joblane admin API.
"""

from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ---------- Auth / identity ----------

class AdminMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    permissions: List[str] = []


# ---------- Companies ----------

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
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    status: str
    verified_at: Optional[datetime] = None
    featured_until: Optional[datetime] = None
    created_at: Optional[datetime] = None


class CompanySummary(BaseModel):
    id: UUID
    name: str
    slug: str
    status: str


# ---------- Jobs ----------

class JobOut(BaseModel):
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
    publication_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    status: str
    moderation_reason: Optional[str] = None
    moderation_note: Optional[str] = None
    admin_note: Optional[str] = None
    is_premium: bool
    premium_since: Optional[datetime] = None
    premium_until: Optional[datetime] = None
    is_featured: bool
    featured_since: Optional[datetime] = None
    featured_until: Optional[datetime] = None
    is_urgent: bool
    urgent_until: Optional[datetime] = None
    boost_priority: int
    views: int
    applications_count: int
    favorites_count: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    company_name: Optional[str] = None
    category_name: Optional[str] = None
    region_name: Optional[str] = None


class ModerationHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_status: Optional[str] = None
    to_status: str
    actor_email: Optional[str] = None
    reason: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None


class JobDetailOut(JobOut):
    moderation_history: List[ModerationHistoryOut] = []


class JobListResponse(BaseModel):
    items: List[JobOut]
    total: int
    page: int
    limit: int
    total_pages: int


class ModerationRequest(BaseModel):
    decision: Literal["approve", "reject"]
    reason: Optional[str] = Field(None, max_length=255)
    note: Optional[str] = Field(None, max_length=2000)
    employer_explanation: Optional[str] = Field(None, max_length=1000)


class JobStatusRequest(BaseModel):
    action: Literal["publish", "unpublish", "pause", "archive", "restore"]
    note: Optional[str] = Field(None, max_length=1000)


class PremiumRequest(BaseModel):
    enabled: bool
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    boost_priority: Optional[int] = Field(None, ge=0, le=100)


class FeaturedRequest(BaseModel):
    enabled: bool
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class UrgentRequest(BaseModel):
    enabled: bool
    end_at: Optional[datetime] = None


class JobUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    salary_min: Optional[float] = Field(None, ge=0)
    salary_max: Optional[float] = Field(None, ge=0)
    salary_currency: Optional[str] = Field(None, max_length=3)
    salary_visible: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=255)
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    experience_level: Optional[str] = Field(None, max_length=50)
    application_deadline: Optional[datetime] = None
    admin_note: Optional[str] = None


# ---------- Dashboard ----------

class DashboardResponse(BaseModel):
    jobs: dict
    companies: dict
    users: dict
    applications: dict
    ads: dict
    finance: dict
    moderation_queue: List[JobOut]
    recent_audit: List[dict]
    system_status: dict
