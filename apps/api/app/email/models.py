"""
Email outbox domain for Joblane.

Implements the transactional outbox pattern:
- Email rows are created in the same transaction as the business event
- A background sender polls PENDING rows and delivers via SMTP
- Failed sends are retried with exponential backoff up to max_attempts
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class EmailOutboxStatus:
    """Email outbox row statuses."""
    PENDING = "PENDING"
    SENDING = "SENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class EmailOutbox(Base):
    """
    Transactional outbox row for outbound emails.

    A row is inserted atomically with the business transaction that
    triggered the email. The sender worker picks up PENDING rows.
    """
    __tablename__ = "email_outbox"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    recipient = Column(String(255), nullable=False, index=True)
    template = Column(String(50), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    payload = Column(JSON, nullable=False, server_default="{}")
    status = Column(String(20), nullable=False, default=EmailOutboxStatus.PENDING, server_default="PENDING", index=True)
    attempt_count = Column(Integer, nullable=False, default=0, server_default="0")
    max_attempts = Column(Integer, nullable=False, default=5, server_default="5")
    next_attempt_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now(), index=True)
    last_error_code = Column(String(100))
    last_error_detail = Column(Text)
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, server_default=func.now(), onupdate=utcnow, nullable=False)

    def __repr__(self):
        return f"<EmailOutbox id={self.id} to={self.recipient} template={self.template} status={self.status}>"