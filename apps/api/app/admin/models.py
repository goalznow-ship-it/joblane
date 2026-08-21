"""
Admin domain models for Joblane.

Contains SQLAlchemy models for:
- Company
- JobCategory
- Region
- Industry
- Job
- JobModerationHistory
- CompanyModerationHistory
- Advertisement
- AdvertisementModerationHistory
- Promotion
- AuditLog
- Application (oversight)
- Internship
- Training

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
    UniqueConstraint,
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


class CompanyMemberRole(enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"
    VIEWER = "VIEWER"


class CompanyMembershipStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    SUSPENDED = "SUSPENDED"


class TrainingFormat(enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    HYBRID = "HYBRID"


class ContentStatus(enum.Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PUBLISHED = "PUBLISHED"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    ARCHIVED = "ARCHIVED"


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
    industry_id = Column(UUID(as_uuid=True), ForeignKey("industries.id"))
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
    internships = relationship("Internship", back_populates="company")
    trainings = relationship("Training", back_populates="provider")
    industry_rel = relationship("Industry")
    memberships = relationship(
        "CompanyMembership",
        back_populates="company",
        cascade="all, delete-orphan",
    )


class CompanyMembership(Base):
    """Membership linking a user to a company with an employer role."""

    __tablename__ = "company_memberships"
    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_company_membership_company_user"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(CompanyMemberRole, name="company_member_role"), default=CompanyMemberRole.VIEWER, nullable=False)
    status = Column(Enum(CompanyMembershipStatus, name="company_membership_status"), default=CompanyMembershipStatus.ACTIVE, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    company = relationship("Company", back_populates="memberships")
    user = relationship("User", back_populates="company_memberships")


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


class Industry(Base):
    __tablename__ = "industries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    seo_title = Column(String(255))
    seo_description = Column(Text)
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
    industry_id = Column(UUID(as_uuid=True), ForeignKey("industries.id"))
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
    industry_rel = relationship("Industry")
    applications = relationship("Application", back_populates="job")
    saved_jobs = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")
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


class CompanyModerationHistory(Base):
    __tablename__ = "company_moderation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_email = Column(String(255))
    reason = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)


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
    creative_image_url = Column(String(500))
    mobile_image_url = Column(String(500))
    creative_file_size = Column(Integer)
    creative_mime_type = Column(String(100))
    creative_width = Column(Integer)
    creative_height = Column(Integer)
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

    moderation_history = relationship(
        "AdvertisementModerationHistory",
        back_populates="advertisement",
        cascade="all, delete-orphan",
        order_by="AdvertisementModerationHistory.created_at.desc()",
    )


class AdvertisementModerationHistory(Base):
    __tablename__ = "advertisement_moderation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    advertisement_id = Column(UUID(as_uuid=True), ForeignKey("advertisements.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_email = Column(String(255))
    reason = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    advertisement = relationship("Advertisement", back_populates="moderation_history")


class InternshipModerationHistory(Base):
    __tablename__ = "internship_moderation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    internship_id = Column(UUID(as_uuid=True), ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_email = Column(String(255))
    reason = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    internship = relationship("Internship", back_populates="moderation_history")


class TrainingModerationHistory(Base):
    __tablename__ = "training_moderation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    training_id = Column(UUID(as_uuid=True), ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_email = Column(String(255))
    reason = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    training = relationship("Training", back_populates="moderation_history")


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


class Internship(Base):
    __tablename__ = "internships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    requirements = Column(Text)
    location = Column(String(255))
    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id"))
    work_mode = Column(Enum(WorkMode, name="work_mode"), index=True)
    application_url = Column(String(500))
    application_deadline = Column(DateTime(timezone=True))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    status = Column(Enum(ContentStatus, name="internship_status"), default=ContentStatus.DRAFT, nullable=False, index=True)
    moderation_reason = Column(String(255))
    moderation_note = Column(Text)
    admin_note = Column(Text)
    is_featured = Column(Boolean, default=False, nullable=False, index=True)
    featured_until = Column(DateTime(timezone=True))
    views = Column(Integer, default=0, nullable=False)
    applications_count = Column(Integer, default=0, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    company = relationship("Company", back_populates="internships")
    region = relationship("Region")
    moderation_history = relationship(
        "InternshipModerationHistory",
        back_populates="internship",
        cascade="all, delete-orphan",
        order_by="InternshipModerationHistory.created_at.desc()",
    )


class Training(Base):
    __tablename__ = "trainings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    location = Column(String(255))
    format = Column(Enum(TrainingFormat, name="training_format"), index=True)
    price = Column(Numeric(12, 2))
    currency = Column(String(3), default="AZN")
    application_url = Column(String(500))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    application_deadline = Column(DateTime(timezone=True))
    status = Column(Enum(ContentStatus, name="training_status"), default=ContentStatus.DRAFT, nullable=False, index=True)
    moderation_reason = Column(String(255))
    moderation_note = Column(Text)
    admin_note = Column(Text)
    is_featured = Column(Boolean, default=False, nullable=False, index=True)
    featured_until = Column(DateTime(timezone=True))
    views = Column(Integer, default=0, nullable=False)
    applications_count = Column(Integer, default=0, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    provider = relationship("Company", back_populates="trainings")
    moderation_history = relationship(
        "TrainingModerationHistory",
        back_populates="training",
        cascade="all, delete-orphan",
        order_by="TrainingModerationHistory.created_at.desc()",
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(ApplicationStatus, name="application_status"), default=ApplicationStatus.SUBMITTED, nullable=False, index=True)
    cover_letter = Column(Text)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("candidate_resumes.id", ondelete="SET NULL"))
    applied_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", back_populates="applications")
    resume = relationship("CandidateResume")
    history = relationship(
        "ApplicationHistory",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationHistory.created_at.asc()",
    )


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


# ── Report / Moderation (Phase 6) ──────────────────────────────────────


class ReportTargetType(enum.Enum):
    JOB = "JOB"
    COMPANY = "COMPANY"


class ReportReason(enum.Enum):
    SPAM = "SPAM"
    SCAM = "SCAM"
    FRAUD = "FRAUD"
    MISLEADING_INFORMATION = "MISLEADING_INFORMATION"
    DISCRIMINATORY_CONTENT = "DISCRIMINATORY_CONTENT"
    INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT"
    DUPLICATE_LISTING = "DUPLICATE_LISTING"
    EXPIRED_OR_INVALID = "EXPIRED_OR_INVALID"
    FAKE_COMPANY = "FAKE_COMPANY"
    SUSPICIOUS_CONTACT = "SUSPICIOUS_CONTACT"
    OTHER = "OTHER"


class ReportStatus(enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"
    DUPLICATE = "DUPLICATE"


class ReportPriority(enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ReportResolution(enum.Enum):
    NO_VIOLATION = "NO_VIOLATION"
    CONTENT_REMOVED = "CONTENT_REMOVED"
    CONTENT_PAUSED = "CONTENT_PAUSED"
    COMPANY_ACTION_TAKEN = "COMPANY_ACTION_TAKEN"
    USER_ACTION_TAKEN = "USER_ACTION_TAKEN"
    WARNING_ISSUED = "WARNING_ISSUED"
    OTHER = "OTHER"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    target_type = Column(Enum(ReportTargetType, name="report_target_type", create_type=False), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    reason = Column(Enum(ReportReason, name="report_reason", create_type=False), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ReportStatus, name="report_status", create_type=False), nullable=False, default=ReportStatus.OPEN, index=True)
    priority = Column(Enum(ReportPriority, name="report_priority", create_type=False), nullable=False, default=ReportPriority.NORMAL)
    target_snapshot = Column(JSON, nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution = Column(Enum(ReportResolution, name="report_resolution", create_type=False), nullable=True)
    resolution_note = Column(Text, nullable=True)
    reporter_message = Column(Text, nullable=True)
    duplicate_of = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True)
    source = Column(String(50), nullable=True)
    reporter_ip_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    reporter = relationship("User", foreign_keys=[reporter_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    resolver = relationship("User", foreign_keys=[resolved_by])
    duplicate_report = relationship("Report", remote_side=[id])


class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=True)
    action = Column(String(50), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    report = relationship("Report")


class BlocklistType(enum.Enum):
    EMAIL = "EMAIL"
    EMAIL_DOMAIN = "EMAIL_DOMAIN"


class BlocklistStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class ModerationBlocklist(Base):
    __tablename__ = "moderation_blocklist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    type = Column(Enum(BlocklistType, name="blocklist_type", create_type=False), nullable=False)
    value_normalized = Column(String(255), nullable=False, index=True)
    reason = Column(Text, nullable=True)
    status = Column(Enum(BlocklistStatus, name="blocklist_status", create_type=False), nullable=False, default=BlocklistStatus.ACTIVE, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    note = Column(Text, nullable=True)

    creator = relationship("User")