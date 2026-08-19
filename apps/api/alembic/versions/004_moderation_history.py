"""
Add moderation history for internships and trainings.

Revision ID: 004_moderation_history
Revises: 003_admin_management
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "004_moderation_history"
down_revision = "003_admin_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "internship_moderation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("internship_id", UUID(as_uuid=True), sa.ForeignKey("internships.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(50)),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("actor_email", sa.String(255)),
        sa.Column("reason", sa.String(255)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "training_moderation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()"), index=True),
        sa.Column("training_id", UUID(as_uuid=True), sa.ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(50)),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("actor_email", sa.String(255)),
        sa.Column("reason", sa.String(255)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("training_moderation_history")
    op.drop_table("internship_moderation_history")