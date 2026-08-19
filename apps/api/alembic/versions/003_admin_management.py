"""
Admin management migration - Phase C-F.

Adds:
- Industries table (normalized from string field)
- Internships table
- Trainings table
- Additional company fields for featured employer
- Additional advertisement fields for upload support
- User session management fields
- Moderation history for companies

Revision ID: 003_admin_management
Revises: 002_admin_core
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "003_admin_management"
down_revision = "002_admin_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Industries table (normalized from string)
    op.create_table(
        "industries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("seo_title", sa.String(255)),
        sa.Column("seo_description", sa.Text()),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Internships table - use String with CHECK constraint referencing work_mode values
    op.create_table(
        "internships",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("requirements", sa.Text()),
        sa.Column("location", sa.String(255)),
        sa.Column("region_id", UUID(as_uuid=True), sa.ForeignKey("regions.id")),
        sa.Column("work_mode", sa.String(20)),
        sa.Column("application_url", sa.String(500)),
        sa.Column("application_deadline", sa.DateTime(timezone=True)),
        sa.Column("start_date", sa.DateTime(timezone=True)),
        sa.Column("end_date", sa.DateTime(timezone=True)),
        sa.Column("status", sa.Enum("DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "PAUSED", "EXPIRED", "ARCHIVED", name="internship_status"), server_default="DRAFT", nullable=False, index=True),
        sa.Column("moderation_reason", sa.String(255)),
        sa.Column("moderation_note", sa.Text()),
        sa.Column("admin_note", sa.Text()),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False, index=True),
        sa.Column("featured_until", sa.DateTime(timezone=True)),
        sa.Column("views", sa.Integer(), server_default="0", nullable=False),
        sa.Column("applications_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Add check constraint for work_mode
    op.execute("ALTER TABLE internships ADD CONSTRAINT internships_work_mode_check CHECK (work_mode IN ('ON_SITE', 'REMOTE', 'HYBRID'))")

    # Trainings table - use new training_format enum
    op.create_table(
        "trainings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("provider_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("location", sa.String(255)),
        sa.Column("format", sa.Enum("ONLINE", "OFFLINE", "HYBRID", name="training_format"), index=True),
        sa.Column("price", sa.Numeric(12, 2)),
        sa.Column("currency", sa.String(3), server_default="AZN"),
        sa.Column("application_url", sa.String(500)),
        sa.Column("start_date", sa.DateTime(timezone=True)),
        sa.Column("end_date", sa.DateTime(timezone=True)),
        sa.Column("application_deadline", sa.DateTime(timezone=True)),
        sa.Column("status", sa.Enum("DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "PAUSED", "EXPIRED", "ARCHIVED", name="training_status"), server_default="DRAFT", nullable=False, index=True),
        sa.Column("moderation_reason", sa.String(255)),
        sa.Column("moderation_note", sa.Text()),
        sa.Column("admin_note", sa.Text()),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False, index=True),
        sa.Column("featured_until", sa.DateTime(timezone=True)),
        sa.Column("views", sa.Integer(), server_default="0", nullable=False),
        sa.Column("applications_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    # Company moderation history
    op.create_table(
        "company_moderation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(50)),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("actor_email", sa.String(255)),
        sa.Column("reason", sa.String(255)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Advertisement moderation history
    op.create_table(
        "advertisement_moderation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("advertisement_id", UUID(as_uuid=True), sa.ForeignKey("advertisements.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(50)),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("actor_email", sa.String(255)),
        sa.Column("reason", sa.String(255)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Add industry_id to companies (foreign key to industries)
    op.add_column("companies", sa.Column("industry_id", UUID(as_uuid=True), sa.ForeignKey("industries.id")))
    op.create_index("ix_companies_industry_id", "companies", ["industry_id"])

    # Add industry_id to jobs (foreign key to industries)
    op.add_column("jobs", sa.Column("industry_id", UUID(as_uuid=True), sa.ForeignKey("industries.id")))
    op.create_index("ix_jobs_industry_id", "jobs", ["industry_id"])

    # Add additional advertisement fields for upload support
    op.add_column("advertisements", sa.Column("creative_image_url", sa.String(500)))
    op.add_column("advertisements", sa.Column("mobile_image_url", sa.String(500)))
    op.add_column("advertisements", sa.Column("creative_file_size", sa.Integer()))
    op.add_column("advertisements", sa.Column("creative_mime_type", sa.String(100)))
    op.add_column("advertisements", sa.Column("creative_width", sa.Integer()))
    op.add_column("advertisements", sa.Column("creative_height", sa.Integer()))

    # Add additional user fields for session management
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True)))
    op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), server_default="0"))
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True)))

    # Add indexes for advertisement selection queries
    op.create_index("ix_advertisements_placement_status_active", "advertisements", ["placement", "status", "start_at", "end_at"])
    op.create_index("ix_advertisements_priority_created", "advertisements", ["priority", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_advertisements_priority_created", table_name="advertisements")
    op.drop_index("ix_advertisements_placement_status_active", table_name="advertisements")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("users", "last_login_at")
    op.drop_column("advertisements", "creative_height")
    op.drop_column("advertisements", "creative_width")
    op.drop_column("advertisements", "creative_mime_type")
    op.drop_column("advertisements", "creative_file_size")
    op.drop_column("advertisements", "mobile_image_url")
    op.drop_column("advertisements", "creative_image_url")
    op.drop_index("ix_jobs_industry_id", table_name="jobs")
    op.drop_column("jobs", "industry_id")
    op.drop_index("ix_companies_industry_id", table_name="companies")
    op.drop_column("companies", "industry_id")
    op.drop_table("advertisement_moderation_history")
    op.drop_table("company_moderation_history")
    op.drop_table("trainings")
    op.drop_table("internships")
    op.drop_table("industries")