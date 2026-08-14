"""
Domain events for authentication.

Defines events that can be emitted during authentication flows.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class UserRegisteredEvent(BaseModel):
    """Event emitted when a user registers."""
    user_id: UUID
    email: str
    onboarding_intent: Optional[str] = None
    timestamp: datetime = datetime.utcnow()


class UserEmailVerifiedEvent(BaseModel):
    """Event emitted when a user verifies their email."""
    user_id: UUID
    email: str
    timestamp: datetime = datetime.utcnow()


class UserLoggedInEvent(BaseModel):
    """Event emitted when a user logs in."""
    user_id: UUID
    session_id: UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = datetime.utcnow()


class UserLoggedOutEvent(BaseModel):
    """Event emitted when a user logs out."""
    user_id: UUID
    session_id: UUID
    timestamp: datetime = datetime.utcnow()


class UserPasswordResetRequestedEvent(BaseModel):
    """Event emitted when password reset is requested."""
    user_id: UUID
    email: str
    timestamp: datetime = datetime.utcnow()


class UserPasswordResetEvent(BaseModel):
    """Event emitted when password is reset."""
    user_id: UUID
    email: str
    timestamp: datetime = datetime.utcnow()


class UserPasswordChangedEvent(BaseModel):
    """Event emitted when password is changed."""
    user_id: UUID
    email: str
    timestamp: datetime = datetime.utcnow()