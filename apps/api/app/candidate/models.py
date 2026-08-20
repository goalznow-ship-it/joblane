"""
Candidate domain models for Joblane.

Contains SQLAlchemy models for:
- CandidateProfile
- CandidateExperience
- CandidateEducation
- CandidateResume
- SavedJob
- ApplicationHistory

Candidate identity is a User row (role stays "USER"); these models attach
candidate-specific data to that user without touching the auth model.
"""

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    Date,
    Integer,
    JSON,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    headline = Column(String(255))
    summary = Column(Text)
    phone = Column(String(64))
    location = Column(String(255))
    website = Column(String(255))
    linkedin_url = Column(String(255))
    github_url = Column(String(255))
    skills = Column(JSON, default=list)
    experience_years = Column(Integer, default=0)
    is_public = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    user = relationship("User", back_populates="candidate_profile")
    experiences = relationship(
        "CandidateExperience",
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="CandidateExperience.start_date.desc().nullslast()",
    )
    educations = relationship(
        "CandidateEducation",
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="CandidateEducation.start_date.desc().nullslast()",
    )
    resumes = relationship(
        "CandidateResume",
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="CandidateResume.created_at.desc()",
    )


class CandidateExperience(Base):
    __tablename__ = "candidate_experiences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_profile_id = Column(UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    company_name = Column(String(255))
    location = Column(String(255))
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Boolean, default=False, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    profile = relationship("CandidateProfile", back_populates="experiences")


class CandidateEducation(Base):
    __tablename__ = "candidate_educations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_profile_id = Column(UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    institution = Column(String(255), nullable=False)
    degree = Column(String(255))
    field_of_study = Column(String(255))
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Boolean, default=False, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    profile = relationship("CandidateProfile", back_populates="educations")


class CandidateResume(Base):
    __tablename__ = "candidate_resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_profile_id = Column(UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=utcnow)

    profile = relationship("CandidateProfile", back_populates="resumes")


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_saved_job_candidate_job"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    candidate = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_jobs")


class ApplicationHistory(Base):
    __tablename__ = "application_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    changed_by_role = Column(String(20), nullable=False)
    changed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)

    application = relationship("Application", back_populates="history")