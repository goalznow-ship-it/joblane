"""
Admin core migration.

Adds admin role columns to users and creates admin-domain tables:
companies, job_categories, regions, jobs, job_moderation_history,
advertisements, promotions, applications, audit_logs.

Revision ID: 002_admin_core
Revises: 001_initial_auth_tables
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "002_admin_core"
down_revision = "00f03bd54a51"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(255), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(30),
            server_default="USER",
            nullable=False,
        ),
    )
    op.create_index("ix_users_role", "users", ["role"])

    # Companies
    op.create_table(
        "companies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("website", sa.String(255)),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(64)),
        sa.Column("address", sa.String(255)),
        sa.Column("socials", JSONB(), default=dict),
        sa.Column("industry", sa.String(100)),
        sa.Column("logo_url", sa.String(255)),
        sa.Column("cover_url", sa.String(255)),
        sa.Column(
            "status",
            sa.Enum("PENDING", "VERIFIED", "ACTIVE", "SUSPENDED", "REJECTED", "ARCHIVED", name="company_status"),
            server_default="PENDING",
            nullable=False,
            index=True,
        ),
        sa.Column("verified_at", sa.DateTime(timezone=True)),
        sa.Column("verified_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("verification_notes", sa.Text()),
        sa.Column("featured_until", sa.DateTime(timezone=True)),
        sa.Column("featured_priority", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Job categories
    op.create_table(
        "job_categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("icon", sa.String(64)),
        sa.Column("description", sa.Text()),
        sa.Column("seo_title", sa.String(255)),
        sa.Column("seo_description", sa.Text()),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Regions
    op.create_table(
        "regions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("country", sa.String(100), server_default="Azərbaycan"),
        sa.Column("city", sa.String(255)),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Jobs
    op.create_table(
        "jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("requirements", sa.Text()),
        sa.Column("responsibilities", sa.Text()),
        sa.Column("benefits", sa.Text()),
        sa.Column("salary_min", sa.Numeric(12, 2)),
        sa.Column("salary_max", sa.Numeric(12, 2)),
        sa.Column("salary_currency", sa.String(3), server_default="AZN"),
        sa.Column("salary_period", sa.String(20), server_default="MONTH"),
        sa.Column("salary_visible", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("location", sa.String(255)),
        sa.Column("region_id", UUID(as_uuid=True), sa.ForeignKey("regions.id")),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("job_categories.id")),
        sa.Column("industry", sa.String(100)),
        sa.Column(
            "employment_type",
            sa.Enum("FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP", "TEMPORARY", "SEASONAL", name="employment_type"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "work_mode",
            sa.Enum("ON_SITE", "REMOTE", "HYBRID", name="work_mode"),
            index=True,
        ),
        sa.Column("experience_level", sa.String(50)),
        sa.Column("education", sa.Text()),
        sa.Column("application_deadline", sa.DateTime(timezone=True)),
        sa.Column("publication_date", sa.DateTime(timezone=True)),
        sa.Column("expiration_date", sa.DateTime(timezone=True)),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "PAUSED", "EXPIRED", "ARCHIVED", name="job_status"),
            server_default="DRAFT",
            nullable=False,
            index=True,
        ),
        sa.Column("moderation_reason", sa.String(255)),
        sa.Column("moderation_note", sa.Text()),
        sa.Column("admin_note", sa.Text()),
        sa.Column("is_premium", sa.Boolean(), server_default=sa.text("false"), nullable=False, index=True),
        sa.Column("premium_since", sa.DateTime(timezone=True)),
        sa.Column("premium_until", sa.DateTime(timezone=True)),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False, index=True),
        sa.Column("featured_since", sa.DateTime(timezone=True)),
        sa.Column("featured_until", sa.DateTime(timezone=True)),
        sa.Column("is_urgent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("urgent_until", sa.DateTime(timezone=True)),
        sa.Column("boost_priority", sa.Integer(), server_default="0"),
        sa.Column("views", sa.Integer(), server_default="0", nullable=False),
        sa.Column("applications_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("favorites_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Moderation history
    op.create_table(
        "job_moderation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(50)),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("actor_email", sa.String(255)),
        sa.Column("reason", sa.String(255)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Advertisements
    op.create_table(
        "advertisements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("advertiser_name", sa.String(255), nullable=False),
        sa.Column("campaign_name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(100)),
        sa.Column("headline", sa.String(255)),
        sa.Column("description", sa.Text()),
        sa.Column("cta_label", sa.String(64)),
        sa.Column("destination_url", sa.String(500)),
        sa.Column("alt_text", sa.String(255)),
        sa.Column(
            "placement",
            sa.Enum("TOP_LEADERBOARD", "LEFT_SKIN", "RIGHT_SKIN", "RIGHT_SIDEBAR", "INLINE_FEED", "MOBILE_BANNER", name="ad_placement"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "format",
            sa.Enum("970x90", "160x600", "120x600", "300x250", "728x90", "320x100", "CUSTOM_SKIN", name="ad_format"),
            nullable=False,
        ),
        sa.Column("creative_image", sa.String(500)),
        sa.Column("mobile_image", sa.String(500)),
        sa.Column("background", sa.String(64)),
        sa.Column("accent_color", sa.String(32)),
        sa.Column("start_at", sa.DateTime(timezone=True)),
        sa.Column("end_at", sa.DateTime(timezone=True)),
        sa.Column("priority", sa.Integer(), server_default="0"),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED", name="ad_status"),
            server_default="DRAFT",
            nullable=False,
            index=True,
        ),
        sa.Column("impressions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("clicks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Promotions
    op.create_table(
        "promotions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column(
            "promotion_type",
            sa.Enum("PREMIUM", "FEATURED", "URGENT", "FEATURED_EMPLOYER", "SPOTLIGHT", name="promotion_type"),
            nullable=False,
        ),
        sa.Column("start_at", sa.DateTime(timezone=True)),
        sa.Column("end_at", sa.DateTime(timezone=True)),
        sa.Column(
            "status",
            sa.Enum("SCHEDULED", "ACTIVE", "EXPIRED", "CANCELLED", name="promotion_status"),
            server_default="SCHEDULED",
            nullable=False,
        ),
        sa.Column("priority", sa.Integer(), server_default="0"),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Applications (oversight)
    op.create_table(
        "applications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("candidate_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "status",
            sa.Enum("SUBMITTED", "VIEWED", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED", "WITHDRAWN", name="application_status"),
            server_default="SUBMITTED",
            nullable=False,
            index=True,
        ),
        sa.Column("cover_letter", sa.Text()),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Audit logs
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), index=True),
        sa.Column("actor_email", sa.String(255), index=True),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("entity_type", sa.String(100), nullable=False, index=True),
        sa.Column("entity_id", sa.String(100), index=True),
        sa.Column("before", JSONB()),
        sa.Column("after", JSONB()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("applications")
    op.drop_table("promotions")
    op.drop_table("advertisements")
    op.drop_table("job_moderation_history")
    op.drop_table("jobs")
    op.drop_table("regions")
    op.drop_table("job_categories")
    op.drop_table("companies")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_column("users", "role")
    op.drop_column("users", "full_name")
