"""
In-app notifications domain for Joblane.
"""

from sqlalchemy import Column, String, DateTime, Text, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
from app.core.database import Base
import uuid
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class NotificationType:
    """Notification type codes."""
    APPLICATION_STATUS = "APPLICATION_STATUS"
    JOB_APPROVED = "JOB_APPROVED"
    JOB_REJECTED = "JOB_REJECTED"
    JOB_ARCHIVED = "JOB_ARCHIVED"
    COMPANY_APPROVED = "COMPANY_APPROVED"
    COMPANY_REJECTED = "COMPANY_REJECTED"
    ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED"
    ACCOUNT_BLOCKED = "ACCOUNT_BLOCKED"
    ACCOUNT_ACTIVATED = "ACCOUNT_ACTIVATED"
    SESSION_REVOKED = "SESSION_REVOKED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    PASSWORD_RESET = "PASSWORD_RESET"


class Notification(Base):
    """
    In-app notification for a user.

    Notifications are created in the same transaction as the event that
    triggers them, so they are always consistent with domain state.
    """
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    entity_type = Column(String(50), index=True)
    entity_id = Column(String(64))
    action_url = Column(String(500))
    metadata_json = Column("metadata", JSON, server_default="{}")
    read_at = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification id={self.id} user={self.user_id} type={self.type} read={self.read_at is not None}>"