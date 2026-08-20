"""
Add the candidate portal domain.

Creates candidate_profiles, candidate_experiences, candidate_educations,
candidate_resumes, saved_jobs and application_history tables, and adds the
resume_id column to applications.

Revision ID: 006_candidate_portal
Revises: 005_company_memberships
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006_candidate_portal"
down_revision = "005_company_memberships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "candidate_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("headline", sa.String(255)),
        sa.Column("summary", sa.Text()),
        sa.Column("phone", sa.String(64)),
        sa.Column("location", sa.String(255)),
        sa.Column("website", sa.String(255)),
        sa.Column("linkedin_url", sa.String(255)),
        sa.Column("github_url", sa.String(255)),
        sa.Column("skills", sa.JSON(), server_default="[]"),
        sa.Column("experience_years", sa.Integer(), server_default="0"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    op.create_table(
        "candidate_experiences",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("candidate_profile_id", UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("company_name", sa.String(255)),
        sa.Column("location", sa.String(255)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    op.create_table(
        "candidate_educations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("candidate_profile_id", UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("institution", sa.String(255), nullable=False),
        sa.Column("degree", sa.String(255)),
        sa.Column("field_of_study", sa.String(255)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    op.create_table(
        "candidate_resumes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("candidate_profile_id", UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255)),
        sa.Column("file_size", sa.Integer()),
        sa.Column("mime_type", sa.String(100)),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )

    op.create_table(
        "saved_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("candidate_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_saved_job_candidate_job"),
    )

    op.create_table(
        "application_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("application_id", UUID(as_uuid=True), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(50)),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("changed_by_role", sa.String(20), nullable=False),
        sa.Column("changed_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.add_column(
        "applications",
        sa.Column("resume_id", UUID(as_uuid=True), sa.ForeignKey("candidate_resumes.id", ondelete="SET NULL")),
    )


def downgrade() -> None:
    op.drop_column("applications", "resume_id")
    op.drop_table("application_history")
    op.drop_table("saved_jobs")
    op.drop_table("candidate_resumes")
    op.drop_table("candidate_educations")
    op.drop_table("candidate_experiences")
    op.drop_table("candidate_profiles")