"""
Admin domain models for Joblane.

Contains SQLAlchemy models for:
- Company
- JobCategory
- Region
- Job
- JobModerationHistory
- Advertisement
- Promotion
- AuditLog
- Application (oversight)

All models use UUID primary keys in the public schema, managed by Alembic.
"""

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
import uuid
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)



class JobStatus(enum.Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PUBLISHED = "PUBLISHED"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    ARCHIVED = "ARCHIVED"


class EmploymentType(enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    FREELANCE = "FREELANCE"
    INTERNSHIP = "INTERNSHIP"
    TEMPORARY = "TEMPORARY"
    SEASONAL = "SEASONAL"


class WorkMode(enum.Enum):
    ON_SITE = "ON_SITE"
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"


class CompanyStatus(enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class AdStatus(enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    ARCHIVED = "ARCHIVED"


class AdPlacement(enum.Enum):
    TOP_LEADERBOARD = "TOP_LEADERBOARD"
    LEFT_SKIN = "LEFT_SKIN"
    RIGHT_SKIN = "RIGHT_SKIN"
    RIGHT_SIDEBAR = "RIGHT_SIDEBAR"
    INLINE_FEED = "INLINE_FEED"
    MOBILE_BANNER = "MOBILE_BANNER"


class AdFormat(enum.Enum):
    FORMAT_970x90 = "970x90"
    FORMAT_160x600 = "160x600"
    FORMAT_120x600 = "120x600"
    FORMAT_300x250 = "300x250"
    FORMAT_728x90 = "728x90"
    FORMAT_320x100 = "320x100"
    CUSTOM_SKIN = "CUSTOM_SKIN"


class PromotionType(enum.Enum):
    PREMIUM = "PREMIUM"
    FEATURED = "FEATURED"
    URGENT = "URGENT"
    FEATURED_EMPLOYER = "FEATURED_EMPLOYER"
    SPOTLIGHT = "SPOTLIGHT"


class PromotionStatus(enum.Enum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class ApplicationStatus(enum.Enum):
    SUBMITTED = "SUBMITTED"
    VIEWED = "VIEWED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW = "INTERVIEW"
    REJECTED = "REJECTED"
    HIRED = "HIRED"
    WITHDRAWN = "WITHDRAWN"


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    website = Column(String(255))
    email = Column(String(255))
    phone = Column(String(64))
    address = Column(String(255))
    socials = Column(JSON, default=dict)
    industry = Column(String(100))
    logo_url = Column(String(255))
    cover_url = Column(String(255))
    status = Column(Enum(CompanyStatus, name="company_status"), default=CompanyStatus.PENDING, nullable=False, index=True)
    verified_at = Column(DateTime(timezone=True))
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    verification_notes = Column(Text)
    featured_until = Column(DateTime(timezone=True))
    featured_priority = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    jobs = relationship("Job", back_populates="company")


class JobCategory(Base):
    __tablename__ = "job_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    icon = Column(String(64))
    description = Column(Text)
    seo_title = Column(String(255))
    seo_description = Column(Text)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class Region(Base):
    __tablename__ = "regions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    country = Column(String(100), default="Azərbaycan")
    city = Column(String(255))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    requirements = Column(Text)
    responsibilities = Column(Text)
    benefits = Column(Text)
    salary_min = Column(Numeric(12, 2))
    salary_max = Column(Numeric(12, 2))
    salary_currency = Column(String(3), default="AZN")
    salary_period = Column(String(20), default="MONTH")
    salary_visible = Column(Boolean, default=True)
    location = Column(String(255))
    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id"))
    category_id = Column(UUID(as_uuid=True), ForeignKey("job_categories.id"))
    industry = Column(String(100))
    employment_type = Column(Enum(EmploymentType, name="employment_type"), nullable=False, index=True)
    work_mode = Column(Enum(WorkMode, name="work_mode"), index=True)
    experience_level = Column(String(50))
    education = Column(Text)
    application_deadline = Column(DateTime(timezone=True))
    publication_date = Column(DateTime(timezone=True))
    expiration_date = Column(DateTime(timezone=True))

    status = Column(Enum(JobStatus, name="job_status"), default=JobStatus.DRAFT, nullable=False, index=True)
    moderation_reason = Column(String(255))
    moderation_note = Column(Text)
    admin_note = Column(Text)

    is_premium = Column(Boolean, default=False, nullable=False, index=True)
    premium_since = Column(DateTime(timezone=True))
    premium_until = Column(DateTime(timezone=True))
    is_featured = Column(Boolean, default=False, nullable=False, index=True)
    featured_since = Column(DateTime(timezone=True))
    featured_until = Column(DateTime(timezone=True))
    is_urgent = Column(Boolean, default=False, nullable=False)
    urgent_until = Column(DateTime(timezone=True))
    boost_priority = Column(Integer, default=0)

    views = Column(Integer, default=0, nullable=False)
    applications_count = Column(Integer, default=0, nullable=False)
    favorites_count = Column(Integer, default=0, nullable=False)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    company = relationship("Company", back_populates="jobs")
    category = relationship("JobCategory")
    region = relationship("Region")
    moderation_history = relationship(
        "JobModerationHistory",
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="JobModerationHistory.created_at.desc()",
    )


class JobModerationHistory(Base):
    __tablename__ = "job_moderation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_email = Column(String(255))
    reason = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    job = relationship("Job", back_populates="moderation_history")


class Advertisement(Base):
    __tablename__ = "advertisements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    advertiser_name = Column(String(255), nullable=False)
    campaign_name = Column(String(255), nullable=False)
    industry = Column(String(100))
    headline = Column(String(255))
    description = Column(Text)
    cta_label = Column(String(64))
    destination_url = Column(String(500))
    alt_text = Column(String(255))
    placement = Column(Enum(AdPlacement, name="ad_placement"), nullable=False, index=True)
    format = Column(
        Enum(
            AdFormat,
            name="ad_format",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    creative_image = Column(String(500))
    mobile_image = Column(String(500))
    background = Column(String(64))
    accent_color = Column(String(32))
    start_at = Column(DateTime(timezone=True))
    end_at = Column(DateTime(timezone=True))
    priority = Column(Integer, default=0)
    status = Column(Enum(AdStatus, name="ad_status"), default=AdStatus.DRAFT, nullable=False, index=True)
    impressions = Column(Integer, default=0, nullable=False)
    clicks = Column(Integer, default=0, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    promotion_type = Column(Enum(PromotionType, name="promotion_type"), nullable=False)
    start_at = Column(DateTime(timezone=True))
    end_at = Column(DateTime(timezone=True))
    status = Column(Enum(PromotionStatus, name="promotion_status"), default=PromotionStatus.SCHEDULED, nullable=False)
    priority = Column(Integer, default=0)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(ApplicationStatus, name="application_status"), default=ApplicationStatus.SUBMITTED, nullable=False, index=True)
    cover_letter = Column(Text)
    applied_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    actor_email = Column(String(255), index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), index=True)
    before = Column(JSON)
    after = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True)
