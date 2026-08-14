"""
Auth domain models for Joblane identity and authentication.

This module contains SQLAlchemy models for:
- users (identity)
- user_sessions (server-side sessions)
- email_verification_tokens (email verification)
- password_reset_tokens (password reset)

All models use UUID primary keys and are designed for production-grade security.
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from apps.api.app.core.database import Base
import enum
import uuid


class UserStatus(enum.Enum):
    """User account statuses."""
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    BLOCKED = "BLOCKED"
    DELETED = "DELETED"


class User(Base):
    """
    User identity model.
    
    Represents a person's account identity, not their business profile.
    A single user may have multiple roles/contexts (candidate, recruiter, etc.).
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_normalized = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False)
    email_verified_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User id={self.id} email={self.email} status={self.status}>"


class UserSession(Base):
    """
    Server-side user session model.
    
    Implements secure session management with:
    - HttpOnly cookie tokens
    - Token hashing (never store raw tokens)
    - Session expiration
    - Session revocation
    - Last seen tracking
    """
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)  # SHA256 hash of session token
    
    # Session metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True))
    
    # Security metadata (for audit, not authentication)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<UserSession id={self.id} user_id={self.user_id} revoked={self.revoked_at is not None}>"


class EmailVerificationToken(Base):
    """
    Email verification token model.
    
    Implements secure email verification with:
    - Cryptographically random tokens
    - Single-use tokens
    - Token expiration
    - Token hashing (never store raw tokens)
    """
    __tablename__ = "email_verification_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)  # SHA256 hash of verification token
    
    # Token lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="email_verification_tokens")
    
    def __repr__(self):
        return f"<EmailVerificationToken id={self.id} user_id={self.user_id} used={self.used_at is not None}>"


class PasswordResetToken(Base):
    """
    Password reset token model.
    
    Implements secure password reset with:
    - Cryptographically random tokens
    - Single-use tokens
    - Token expiration
    - Token hashing (never store raw tokens)
    - Session invalidation on use
    """
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)  # SHA256 hash of reset token
    
    # Token lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")
    
    def __repr__(self):
        return f"<PasswordResetToken id={self.id} user_id={self.user_id} used={self.used_at is not None}>"


# Create all auth tables
from sqlalchemy import event
from sqlalchemy.schema import CreateTable

