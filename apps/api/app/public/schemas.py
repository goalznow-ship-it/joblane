"""
Pydantic schemas for the Joblane public marketplace API.

Only publicly safe fields are exposed. Internal fields (admin notes,
moderation data, actor ids/emails, audit logs) are intentionally absent.
"""

from typing import Optional, List
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class Meta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int


# ---------- Companies ----------

class PublicCompanySummary(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    verified: bool = False


class PublicCompany(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    industry_id: Optional[UUID] = None
    industry_name: Optional[str] = None
    verified: bool = False
    active_jobs_count: int = 0
    created_at: Optional[datetime] = None


class PublicCompanyDetail(PublicCompany):
    socials: Optional[dict] = None


class CompanyListResponse(BaseModel):
    data: List[PublicCompany]
    meta: Meta


# ---------- Jobs ----------

class PublicJob(BaseModel):
    id: UUID
    slug: str
    title: str
    description: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    salary_visible: Optional[bool] = None
    location: Optional[str] = None
    region_id: Optional[UUID] = None
    region_name: Optional[str] = None
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    category_slug: Optional[str] = None
    industry: Optional[str] = None
    industry_id: Optional[UUID] = None
    industry_name: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    experience_level: Optional[str] = None
    education: Optional[str] = None
    application_deadline: Optional[datetime] = None
    publication_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    is_premium: bool = False
    is_featured: bool = False
    is_urgent: bool = False
    views: int = 0
    company: PublicCompanySummary


class PublicJobDetail(PublicJob):
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    company_profile: Optional[PublicCompany] = None


class JobListResponse(BaseModel):
    data: List[PublicJob]
    meta: Meta


# ---------- Categories / Industries / Regions ----------

class PublicCategory(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: Optional[str] = None
    description: Optional[str] = None
    active_jobs_count: int = 0


class PublicIndustry(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    active_jobs_count: int = 0


class PublicRegion(BaseModel):
    id: UUID
    name: str
    slug: str
    country: Optional[str] = None
    city: Optional[str] = None
    active_jobs_count: int = 0


class CategoryListResponse(BaseModel):
    data: List[PublicCategory]
    meta: Meta


class IndustryListResponse(BaseModel):
    data: List[PublicIndustry]
    meta: Meta


class RegionListResponse(BaseModel):
    data: List[PublicRegion]
    meta: Meta