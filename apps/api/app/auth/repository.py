"""
Auth domain repository.

Handles database operations for authentication domain models.
Separates persistence logic from business logic.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload
from typing import Optional, List
from uuid import UUID
import hashlib
import logging
from datetime import datetime, timedelta, timezone

from app.auth.models import (
    User,
    UserSession,
    EmailVerificationToken,
    PasswordResetToken,
    UserStatus,
)
from app.auth.exceptions import AuthException

logger = logging.getLogger(__name__)


class AuthRepository:
    """Repository for authentication domain operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # User operations
    async def create_user(
        self,
        email: str,
        email_normalized: str,
        password_hash: str,
        status: UserStatus = UserStatus.PENDING_VERIFICATION,
    ) -> User:
        """Create a new user."""
        user = User(
            email=email,
            email_normalized=email_normalized,
            password_hash=password_hash,
            status=status,
        )
        self.session.add(user)
        await self.session.flush()
        logger.info(f"User created: {email}")
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email (case-insensitive)."""
        result = await self.session.execute(
            select(User).where(User.email_normalized == email.lower())
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def update_user(self, user: User, **updates) -> User:
        """Update user fields."""
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        await self.session.flush()
        return user
    
    async def mark_email_verified(self, user: User) -> User:
        """Mark user email as verified."""
        user.email_verified_at = func.now()
        user.status = UserStatus.ACTIVE
        await self.session.flush()
        logger.info(f"User email verified: {user.email}")
        return user
    
    async def update_last_login(self, user: User) -> User:
        """Update user's last login timestamp."""
        user.last_login_at = func.now()
        await self.session.flush()
        return user
    
    # Session operations
    async def create_session(
        self,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UserSession:
        """Create a new user session."""
        session = UserSession(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(session)
        await self.session.flush()
        logger.info(f"Session created for user: {user_id}")
        return session
    
    async def get_session_by_token_hash(self, token_hash: str) -> Optional[UserSession]:
        """Get session by token hash."""
        result = await self.session.execute(
            select(UserSession).where(UserSession.token_hash == token_hash)
        )
        return result.scalar_one_or_none()
    
    async def get_active_sessions(self, user_id: UUID) -> List[UserSession]:
        """Get all active sessions for a user."""
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(UserSession)
            .where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.revoked_at.is_(None),
                    or_(
                        UserSession.expires_at > now,
                        UserSession.expires_at.is_(None),
                    )
                )
            )
            .order_by(UserSession.last_seen_at.desc())
        )
        return result.scalars().all()
    
    async def update_session_last_seen(self, session: UserSession) -> UserSession:
        """Update session's last seen timestamp."""
        session.last_seen_at = func.now()
        await self.session.flush()
        return session
    
    async def revoke_session(self, session: UserSession) -> UserSession:
        """Revoke a session."""
        session.revoked_at = func.now()
        await self.session.flush()
        logger.info(f"Session revoked: {session.id}")
        return session
    
    async def revoke_all_sessions(self, user_id: UUID) -> List[UserSession]:
        """Revoke all sessions for a user."""
        sessions = await self.get_active_sessions(user_id)
        for session in sessions:
            session.revoked_at = func.now()
        await self.session.flush()
        logger.info(f"All sessions revoked for user: {user_id}")
        return sessions
    
    async def delete_expired_sessions(self) -> int:
        """Delete expired sessions."""
        from sqlalchemy import delete
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            delete(UserSession).where(
                and_(
                    UserSession.expires_at.is_not(None),
                    UserSession.expires_at < now,
                    UserSession.revoked_at.is_(None),
                )
            )
        )
        deleted_count = result.rowcount
        logger.info(f"Deleted {deleted_count} expired sessions")
        return deleted_count
    
    # Email verification token operations
    async def create_email_verification_token(
        self,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> EmailVerificationToken:
        """Create an email verification token."""
        token = EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.session.add(token)
        await self.session.flush()
        logger.info(f"Email verification token created for user: {user_id}")
        return token
    
    async def get_email_verification_token(self, token_hash: str) -> Optional[EmailVerificationToken]:
        """Get email verification token by hash."""
        result = await self.session.execute(
            select(EmailVerificationToken)
            .where(EmailVerificationToken.token_hash == token_hash)
            .options(joinedload(EmailVerificationToken.user))
        )
        return result.scalar_one_or_none()
    
    async def mark_verification_token_used(self, token: EmailVerificationToken) -> EmailVerificationToken:
        """Mark verification token as used."""
        token.used_at = func.now()
        await self.session.flush()
        logger.info(f"Email verification token used: {token.id}")
        return token
    
    async def delete_expired_verification_tokens(self) -> int:
        """Delete expired verification tokens."""
        from sqlalchemy import delete
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            delete(EmailVerificationToken).where(
                and_(
                    EmailVerificationToken.expires_at < now,
                    EmailVerificationToken.used_at.is_(None),
                )
            )
        )
        deleted_count = result.rowcount
        logger.info(f"Deleted {deleted_count} expired verification tokens")
        return deleted_count
    
    # Password reset token operations
    async def create_password_reset_token(
        self,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> PasswordResetToken:
        """Create a password reset token."""
        token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.session.add(token)
        await self.session.flush()
        logger.info(f"Password reset token created for user: {user_id}")
        return token
    
    async def get_password_reset_token(self, token_hash: str) -> Optional[PasswordResetToken]:
        """Get password reset token by hash."""
        result = await self.session.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .options(joinedload(PasswordResetToken.user))
        )
        return result.scalar_one_or_none()
    
    async def mark_password_reset_token_used(self, token: PasswordResetToken) -> PasswordResetToken:
        """Mark password reset token as used."""
        token.used_at = func.now()
        await self.session.flush()
        logger.info(f"Password reset token used: {token.id}")
        return token
    
    async def delete_expired_password_reset_tokens(self) -> int:
        """Delete expired password reset tokens."""
        from sqlalchemy import delete
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            delete(PasswordResetToken).where(
                and_(
                    PasswordResetToken.expires_at < now,
                    PasswordResetToken.used_at.is_(None),
                )
            )
        )
        deleted_count = result.rowcount
        logger.info(f"Deleted {deleted_count} expired password reset tokens")
        return deleted_count


# Helper functions

def hash_token(token: str) -> str:
    """Hash a token for secure storage."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def normalize_email(email: str) -> str:
    """Normalize email for case-insensitive comparison."""
    return email.strip().lower()

def generate_session_token() -> str:
    """Generate a cryptographically secure session token."""
    import secrets
    return secrets.token_urlsafe(64)

def generate_verification_token() -> str:
    """Generate a cryptographically secure verification token."""
    import secrets
    return secrets.token_urlsafe(32)

def generate_reset_token() -> str:
    """Generate a cryptographically secure password reset token."""
    import secrets
    return secrets.token_urlsafe(32)