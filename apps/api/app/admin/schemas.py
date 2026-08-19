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
    socials: Optional[dict] = None
    industry: Optional[str] = None
    industry_id: Optional[UUID] = None
    industry_name: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    status: str
    verified_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    verification_notes: Optional[str] = None
    featured_until: Optional[datetime] = None
    featured_priority: int
    active_jobs_count: Optional[int] = None
    total_jobs_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CompanySummary(BaseModel):
    id: UUID
    name: str
    slug: str
    status: str


class CompanyListResponse(BaseModel):
    items: List[CompanyOut]
    total: int
    page: int
    limit: int
    total_pages: int


class CompanyDetailOut(CompanyOut):
    moderation_history: List[dict] = []


class CompanyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=64)
    address: Optional[str] = Field(None, max_length=255)
    socials: Optional[dict] = None
    industry_id: Optional[UUID] = None
    logo_url: Optional[str] = Field(None, max_length=255)
    cover_url: Optional[str] = Field(None, max_length=255)
    status: Optional[Literal["PENDING", "VERIFIED", "ACTIVE", "SUSPENDED", "REJECTED", "ARCHIVED"]] = "PENDING"


class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=64)
    address: Optional[str] = Field(None, max_length=255)
    socials: Optional[dict] = None
    industry_id: Optional[UUID] = None
    logo_url: Optional[str] = Field(None, max_length=255)
    cover_url: Optional[str] = Field(None, max_length=255)
    featured_until: Optional[datetime] = None
    featured_priority: Optional[int] = Field(None, ge=0)


class CompanyStatusRequest(BaseModel):
    action: Literal["verify", "unverify", "activate", "suspend", "reject", "archive", "restore"]
    reason: Optional[str] = Field(None, max_length=255)
    note: Optional[str] = Field(None, max_length=2000)


class FeaturedEmployerRequest(BaseModel):
    enabled: bool
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    priority: Optional[int] = Field(None, ge=0)


# ---------- Users ----------

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    email_normalized: str
    full_name: Optional[str] = None
    role: str
    status: str
    email_verified_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserListResponse(BaseModel):
    items: List[UserOut]
    total: int
    page: int
    limit: int
    total_pages: int


class UserDetailOut(UserOut):
    active_sessions_count: Optional[int] = None
    company_name: Optional[str] = None
    applications_count: Optional[int] = None


class UserStatusRequest(BaseModel):
    action: Literal["suspend", "unsuspend", "deactivate", "reactivate"]
    reason: Optional[str] = Field(None, max_length=255)


class RevokeSessionsRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)


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


# ---------- Categories ----------

class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    icon: Optional[str] = None
    description: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    sort_order: int
    is_active: bool
    total_jobs_count: Optional[int] = None
    active_jobs_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CategoryListResponse(BaseModel):
    items: List[CategoryOut]
    total: int
    page: int
    limit: int
    total_pages: int


class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    icon: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=255)
    seo_description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255)
    icon: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=255)
    seo_description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ---------- Industries ----------

class IndustryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    sort_order: int
    is_active: bool
    total_companies_count: Optional[int] = None
    total_jobs_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class IndustryListResponse(BaseModel):
    items: List[IndustryOut]
    total: int
    page: int
    limit: int
    total_pages: int


class IndustryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=255)
    seo_description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class IndustryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=255)
    seo_description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ---------- Regions ----------

class RegionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    country: str
    city: Optional[str] = None
    sort_order: int
    is_active: bool
    total_jobs_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RegionListResponse(BaseModel):
    items: List[RegionOut]
    total: int
    page: int
    limit: int
    total_pages: int


class RegionCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    country: str = Field(default="Azərbaycan", max_length=100)
    city: Optional[str] = Field(None, max_length=255)
    sort_order: int = 0
    is_active: bool = True


class RegionUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255)
    country: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=255)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ---------- Generic status for categories/industries/regions ----------

class ContentStatusRequest(BaseModel):
    action: Literal["activate", "deactivate", "archive"]
    reason: Optional[str] = Field(None, max_length=255)


# ---------- Internships ----------

class InternshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    company_name: Optional[str] = None
    title: str
    slug: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = None
    region_id: Optional[UUID] = None
    region_name: Optional[str] = None
    work_mode: Optional[str] = None
    application_url: Optional[str] = None
    application_deadline: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str
    moderation_reason: Optional[str] = None
    moderation_note: Optional[str] = None
    admin_note: Optional[str] = None
    is_featured: bool
    featured_until: Optional[datetime] = None
    views: int
    applications_count: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class InternshipListResponse(BaseModel):
    items: List[InternshipOut]
    total: int
    page: int
    limit: int
    total_pages: int


class InternshipCreateRequest(BaseModel):
    company_id: UUID
    title: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    region_id: Optional[UUID] = None
    work_mode: Optional[str] = None
    application_url: Optional[str] = Field(None, max_length=500)
    application_deadline: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = "DRAFT"


class InternshipUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    region_id: Optional[UUID] = None
    work_mode: Optional[str] = None
    application_url: Optional[str] = Field(None, max_length=500)
    application_deadline: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_featured: Optional[bool] = None
    featured_until: Optional[datetime] = None


class InternshipStatusRequest(BaseModel):
    action: Literal["approve", "reject", "publish", "unpublish", "feature", "archive", "restore"]
    reason: Optional[str] = Field(None, max_length=255)
    note: Optional[str] = Field(None, max_length=2000)


# ---------- Trainings ----------

class TrainingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    provider_name: Optional[str] = None
    title: str
    slug: str
    description: Optional[str] = None
    location: Optional[str] = None
    format: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    application_url: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    status: str
    moderation_reason: Optional[str] = None
    moderation_note: Optional[str] = None
    admin_note: Optional[str] = None
    is_featured: bool
    featured_until: Optional[datetime] = None
    views: int
    applications_count: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TrainingListResponse(BaseModel):
    items: List[TrainingOut]
    total: int
    page: int
    limit: int
    total_pages: int


class TrainingCreateRequest(BaseModel):
    provider_id: UUID
    title: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    format: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(default="AZN", max_length=3)
    application_url: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    status: Optional[str] = "DRAFT"


class TrainingUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    format: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    application_url: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    is_featured: Optional[bool] = None
    featured_until: Optional[datetime] = None


class TrainingStatusRequest(BaseModel):
    action: Literal["approve", "reject", "publish", "unpublish", "feature", "archive", "restore"]
    reason: Optional[str] = Field(None, max_length=255)
    note: Optional[str] = Field(None, max_length=2000)


# ---------- Advertisements ----------

class AdvertisementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    advertiser_name: str
    campaign_name: str
    industry: Optional[str] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    cta_label: Optional[str] = None
    destination_url: Optional[str] = None
    alt_text: Optional[str] = None
    placement: str
    format: str
    creative_image: Optional[str] = None
    mobile_image: Optional[str] = None
    creative_image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    creative_file_size: Optional[int] = None
    creative_mime_type: Optional[str] = None
    creative_width: Optional[int] = None
    creative_height: Optional[int] = None
    background: Optional[str] = None
    accent_color: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    priority: int
    status: str
    impressions: int
    clicks: int
    ctr: Optional[float] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AdvertisementListResponse(BaseModel):
    items: List[AdvertisementOut]
    total: int
    page: int
    limit: int
    total_pages: int


class AdvertisementDetailOut(AdvertisementOut):
    moderation_history: List[dict] = []


class AdvertisementCreateRequest(BaseModel):
    advertiser_name: str = Field(..., min_length=2, max_length=255)
    campaign_name: str = Field(..., min_length=2, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    headline: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    cta_label: Optional[str] = Field(None, max_length=64)
    destination_url: Optional[str] = Field(None, max_length=500)
    alt_text: Optional[str] = Field(None, max_length=255)
    placement: str
    format: str
    creative_image: Optional[str] = None
    mobile_image: Optional[str] = None
    creative_image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    background: Optional[str] = Field(None, max_length=64)
    accent_color: Optional[str] = Field(None, max_length=32)
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    priority: int = Field(default=0, ge=0)
    status: Optional[str] = "DRAFT"


class AdvertisementUpdateRequest(BaseModel):
    advertiser_name: Optional[str] = Field(None, min_length=2, max_length=255)
    campaign_name: Optional[str] = Field(None, min_length=2, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    headline: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    cta_label: Optional[str] = Field(None, max_length=64)
    destination_url: Optional[str] = Field(None, max_length=500)
    alt_text: Optional[str] = Field(None, max_length=255)
    placement: Optional[str] = None
    format: Optional[str] = None
    creative_image: Optional[str] = None
    mobile_image: Optional[str] = None
    creative_image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    background: Optional[str] = Field(None, max_length=64)
    accent_color: Optional[str] = Field(None, max_length=32)
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    priority: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None


class AdvertisementStatusRequest(BaseModel):
    action: Literal["activate", "pause", "resume", "archive", "schedule"]
    reason: Optional[str] = Field(None, max_length=255)


class AdvertisementUploadResponse(BaseModel):
    url: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None


# ---------- Public Ads API ----------

class PublicAdOut(BaseModel):
    id: UUID
    advertiser_name: str
    campaign_name: str
    headline: Optional[str] = None
    description: Optional[str] = None
    cta_label: Optional[str] = None
    destination_url: Optional[str] = None
    alt_text: Optional[str] = None
    format: str
    creative_image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    background: Optional[str] = None
    accent_color: Optional[str] = None


class PublicAdsResponse(BaseModel):
    items: List[PublicAdOut]