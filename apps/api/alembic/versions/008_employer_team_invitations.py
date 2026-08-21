"""employer team invitations

Revision ID: 008_employer_team_invitations
Revises: 007_notifications_account
Create Date: 2026-08-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision = "008_employer_team_invitations"
down_revision = "007_notifications_account"
branch_labels = None
depends_on = None

invitation_status = ENUM(
    "PENDING", "ACCEPTED", "REVOKED", "EXPIRED",
    name="invitation_status",
    create_type=False,
)


def upgrade() -> None:
    invitation_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "company_invitations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("email_normalized", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("status", invitation_status, nullable=False, server_default="PENDING"),
        sa.Column("invited_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_company_invitations_company_id", "company_invitations", ["company_id"])
    op.create_index("ix_company_invitations_email_normalized", "company_invitations", ["email_normalized"])
    op.create_index("ix_company_invitations_status", "company_invitations", ["status"])
    op.create_index("ix_company_invitations_token_hash", "company_invitations", ["token_hash"])


def downgrade() -> None:
    op.drop_table("company_invitations")
    invitation_status.drop(op.get_bind(), checkfirst=True)
