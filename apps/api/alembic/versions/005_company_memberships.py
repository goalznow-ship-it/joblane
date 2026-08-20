"""
Add company memberships for the employer portal.

Links users to companies with an employer role (OWNER/ADMIN/RECRUITER/VIEWER)
and a membership status (ACTIVE/INVITED/SUSPENDED).

Revision ID: 005_company_memberships
Revises: 004_moderation_history
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "005_company_memberships"
down_revision = "004_moderation_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_memberships",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "role",
            sa.Enum("OWNER", "ADMIN", "RECRUITER", "VIEWER", name="company_member_role"),
            nullable=False,
            server_default="VIEWER",
        ),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "INVITED", "SUSPENDED", name="company_membership_status"),
            nullable=False,
            server_default="ACTIVE",
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
        sa.UniqueConstraint("company_id", "user_id", name="uq_company_membership_company_user"),
    )


def downgrade() -> None:
    op.drop_table("company_memberships")
    op.execute("DROP TYPE IF EXISTS company_member_role")
    op.execute("DROP TYPE IF EXISTS company_membership_status")