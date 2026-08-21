"""reports and moderation

Revision ID: 009_reports_moderation
Revises: 008_employer_team_invitations
Create Date: 2026-08-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON, ENUM

revision = "009_reports_moderation"
down_revision = "008_employer_team_invitations"
branch_labels = None
depends_on = None

_report_target_type = ENUM("JOB", "COMPANY", name="report_target_type", create_type=False)
_report_reason = ENUM(
    "SPAM", "SCAM", "FRAUD", "MISLEADING_INFORMATION", "DISCRIMINATORY_CONTENT",
    "INAPPROPRIATE_CONTENT", "DUPLICATE_LISTING", "EXPIRED_OR_INVALID",
    "FAKE_COMPANY", "SUSPICIOUS_CONTACT", "OTHER",
    name="report_reason", create_type=False,
)
_report_status = ENUM(
    "OPEN", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "DISMISSED", "DUPLICATE",
    name="report_status", create_type=False,
)
_report_priority = ENUM("LOW", "NORMAL", "HIGH", "CRITICAL", name="report_priority", create_type=False)
_report_resolution = ENUM(
    "NO_VIOLATION", "CONTENT_REMOVED", "CONTENT_PAUSED", "COMPANY_ACTION_TAKEN",
    "USER_ACTION_TAKEN", "WARNING_ISSUED", "OTHER",
    name="report_resolution", create_type=False,
)
_blocklist_type = ENUM("EMAIL", "EMAIL_DOMAIN", name="blocklist_type", create_type=False)
_blocklist_status = ENUM("ACTIVE", "INACTIVE", name="blocklist_status", create_type=False)


def upgrade() -> None:
    for e in [_report_target_type, _report_reason, _report_status, _report_priority,
              _report_resolution, _blocklist_type, _blocklist_status]:
        e.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("reporter_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_type", _report_target_type, nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("reason", _report_reason, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", _report_status, nullable=False, server_default="OPEN"),
        sa.Column("priority", _report_priority, nullable=False, server_default="NORMAL"),
        sa.Column("target_snapshot", JSON, nullable=True),
        sa.Column("assigned_to", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution", _report_resolution, nullable=True),
        sa.Column("resolution_note", sa.Text, nullable=True),
        sa.Column("reporter_message", sa.Text, nullable=True),
        sa.Column("duplicate_of", UUID(as_uuid=True), sa.ForeignKey("reports.id"), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("reporter_ip_hash", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reports_reporter_id", "reports", ["reporter_id"])
    op.create_index("ix_reports_target_id", "reports", ["target_id"])
    op.create_index("ix_reports_status", "reports", ["status"])
    op.create_index("ix_reports_target_type", "reports", ["target_type"])

    op.create_table(
        "report_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("report_id", UUID(as_uuid=True), sa.ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_report_history_report_id", "report_history", ["report_id"])

    op.create_table(
        "moderation_blocklist",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("type", _blocklist_type, nullable=False),
        sa.Column("value_normalized", sa.String(255), nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("status", _blocklist_status, nullable=False, server_default="ACTIVE"),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
    )
    op.create_index("ix_moderation_blocklist_value_normalized", "moderation_blocklist", ["value_normalized"])
    op.create_index("ix_moderation_blocklist_status", "moderation_blocklist", ["status"])


def downgrade() -> None:
    op.drop_table("moderation_blocklist")
    op.drop_table("report_history")
    op.drop_table("reports")
    for e in [_blocklist_status, _blocklist_type, _report_resolution, _report_priority,
              _report_status, _report_reason, _report_target_type]:
        e.drop(op.get_bind(), checkfirst=True)
