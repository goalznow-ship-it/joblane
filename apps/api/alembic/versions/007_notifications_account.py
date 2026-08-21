"""
Add the notification system and email outbox.

Creates email_outbox (transactional outbox for email delivery) and
notifications (in-app notifications) tables.

Revision ID: 007_notifications_account
Revises: 006_candidate_portal
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "007_notifications_account"
down_revision = "006_candidate_portal"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_outbox",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("recipient", sa.String(255), nullable=False, index=True),
        sa.Column("template", sa.String(50), nullable=False, index=True),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING", index=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
        sa.Column("last_error_code", sa.String(100)),
        sa.Column("last_error_detail", sa.Text()),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text()),
        sa.Column("entity_type", sa.String(50), index=True),
        sa.Column("entity_id", sa.String(64)),
        sa.Column("action_url", sa.String(500)),
        sa.Column("metadata", sa.JSON(), server_default="{}"),
        sa.Column("read_at", sa.DateTime(timezone=True), index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, index=True),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("email_outbox")