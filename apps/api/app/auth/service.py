"""
Auth domain service layer.

Contains business logic for authentication operations.
Coordinates between repository and external services.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta, timezone
import logging

from app.auth.models import User, UserSession, UserStatus
from app.auth.repository import AuthRepository, hash_token, normalize_email
from app.auth.exceptions import (
    AuthInvalidCredentials,
    AuthEmailNotVerified,
    AuthAccountSuspended,
    AuthAccountBlocked,
    AuthException,
)
from app.core.security import verify_password, get_password_hash
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Service layer for authentication business logic."""
    
    def __init__(self, session: AsyncSession):
        self.repository = AuthRepository(session)
    
    # User operations
    async def register_user(
        self,
        email: str,
        password: str,
        onboarding_intent: Optional[str] = None,
    ) -> Tuple[User, str]:
        """
        Register a new user.
        
        Returns:
            Tuple[User, verification_token] where verification_token is the raw token
        """
        # Normalize email
        email_normalized = normalize_email(email)
        
        # Check if user already exists
        existing_user = await self.repository.get_user_by_email(email_normalized)
        if existing_user:
            if existing_user.status == UserStatus.DELETED:
                # Reactivate deleted account
                existing_user = await self.repository.update_user(
                    existing_user,
                    status=UserStatus.PENDING_VERIFICATION,
                    deleted_at=None,
                )
            # Return existing user with appropriate message
            if existing_user.status == UserStatus.ACTIVE:
                raise AuthException(
                    detail="Account already exists and is active",
                    status_code=400,
                )
            logger.warning(f"Registration attempted for existing user: {email}")
            return existing_user, None
        
        # Hash password
        password_hash = get_password_hash(password)
        
        # Create user
        user = await self.repository.create_user(
            email=email,
            email_normalized=email_normalized,
            password_hash=password_hash,
            status=UserStatus.PENDING_VERIFICATION,
        )
        
        # Generate verification token
        verification_token = generate_verification_token()
        token_hash = hash_token(verification_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        await self.repository.create_email_verification_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        
        logger.info(f"User registered: {email} (status: {user.status})")
        return user, verification_token
    
    async def verify_email(self, token: str) -> User:
        """Verify user email using token."""
        token_hash = hash_token(token)
        
        # Get token
        db_token = await self.repository.get_email_verification_token(token_hash)
        if not db_token:
            logger.warning("Email verification token not found")
            raise AuthException(
                detail="Invalid verification token",
                status_code=400,
            )
        
        # Check if token expired
        if db_token.expires_at < datetime.now(timezone.utc):
            logger.warning("Email verification token expired")
            raise AuthException(
                detail="Verification token expired",
                status_code=400,
            )
        
        # Check if token already used
        if db_token.used_at:
            logger.warning("Email verification token already used")
            raise AuthException(
                detail="Verification token already used",
                status_code=400,
            )
        
        # Mark token as used
        await self.repository.mark_verification_token_used(db_token)
        
        # Mark user as verified
        user = await self.repository.mark_email_verified(db_token.user)
        
        logger.info(f"Email verified for user: {user.email}")
        return user
    
    async def resend_verification_email(self, email: str) -> User:
        """Resend verification email."""
        email_normalized = normalize_email(email)
        user = await self.repository.get_user_by_email(email_normalized)
        
        if not user:
            # Don't reveal that user doesn't exist
            logger.info(f"Resend verification attempted for non-existent email: {email}")
            return None
        
        if user.status == UserStatus.ACTIVE:
            logger.warning(f"Resend verification attempted for already verified user: {email}")
            raise AuthException(
                detail="Email already verified",
                status_code=400,
            )
        
        # Delete old tokens
        await self.repository.delete_expired_verification_tokens()
        
        # Generate new verification token
        verification_token = generate_verification_token()
        token_hash = hash_token(verification_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        await self.repository.create_email_verification_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        
        logger.info(f"Resend verification email sent to: {email}")
        return user
    
    async def login_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, UserSession]:
        """Login user and create session."""
        email_normalized = normalize_email(email)
        user = await self.repository.get_user_by_email(email_normalized)
        
        # Always return same error to prevent enumeration
        if not user or not verify_password(password, user.password_hash):
            logger.warning(f"Failed login attempt for email: {email}")
            raise AuthInvalidCredentials()
        
        # Check account status
        if user.status == UserStatus.SUSPENDED:
            logger.warning(f"Login attempt for suspended account: {email}")
            raise AuthAccountSuspended()
        
        if user.status == UserStatus.BLOCKED:
            logger.warning(f"Login attempt for blocked account: {email}")
            raise AuthAccountBlocked()
        
        if user.status == UserStatus.DELETED:
            logger.warning(f"Login attempt for deleted account: {email}")
            raise AuthException(
                detail="Account deleted",
                status_code=403,
            )
        
        # Check if email verified
        if user.status == UserStatus.PENDING_VERIFICATION:
            logger.warning(f"Login attempt for unverified account: {email}")
            raise AuthEmailNotVerified()
        
        # Update last login
        user = await self.repository.update_user(user, last_login_at=func.now())
        
        # Create session
        session_token = generate_session_token()
        token_hash = hash_token(session_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = await self.repository.create_session(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        logger.info(f"User logged in: {email}")
        return user, session
    
    async def logout_user(self, session: UserSession) -> None:
        """Logout user by revoking session."""
        await self.repository.revoke_session(session)
        logger.info(f"User logged out: session {session.id}")
    
    async def logout_all_sessions(self, user_id: UUID) -> None:
        """Logout user from all devices."""
        await self.repository.revoke_all_sessions(user_id)
        logger.info(f"All sessions revoked for user: {user_id}")
    
    async def forgot_password(self, email: str) -> Optional[User]:
        """
        Initiate password reset flow.
        
        Returns user if exists (for email sending), None otherwise.
        """
        email_normalized = normalize_email(email)
        user = await self.repository.get_user_by_email(email_normalized)
        
        if user:
            # Generate reset token
            reset_token = generate_reset_token()
            token_hash = hash_token(reset_token)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            
            await self.repository.create_password_reset_token(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            
            logger.info(f"Password reset initiated for user: {email}")
        else:
            # Don't reveal user doesn't exist
            logger.info(f"Password reset attempted for non-existent email: {email}")
        
        return user
    
    async def reset_password(
        self,
        token: str,
        new_password: str,
    ) -> User:
        """Reset password using token."""
        token_hash = hash_token(token)
        
        # Get token
        db_token = await self.repository.get_password_reset_token(token_hash)
        if not db_token:
            logger.warning("Password reset token not found")
            raise AuthException(
                detail="Invalid reset token",
                status_code=400,
            )
        
        # Check if token expired
        if db_token.expires_at < datetime.now(timezone.utc):
            logger.warning("Password reset token expired")
            raise AuthException(
                detail="Reset token expired",
                status_code=400,
            )
        
        # Check if token already used
        if db_token.used_at:
            logger.warning("Password reset token already used")
            raise AuthException(
                detail="Reset token already used",
                status_code=400,
            )
        
        # Hash new password
        new_password_hash = get_password_hash(new_password)
        
        # Update user password
        user = await self.repository.update_user(
            db_token.user,
            password_hash=new_password_hash,
        )
        
        # Mark token as used
        await self.repository.mark_password_reset_token_used(db_token)
        
        # Revoke all existing sessions
        await self.repository.revoke_all_sessions(user.id)
        
        logger.info(f"Password reset for user: {user.email}")
        return user
    
    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> User:
        """Change password for authenticated user."""
        # Verify current password
        if not verify_password(current_password, user.password_hash):
            logger.warning(f"Password change failed - wrong current password for user: {user.email}")
            raise AuthException(
                detail="Current password is incorrect",
                status_code=400,
            )
        
        # Hash new password
        new_password_hash = get_password_hash(new_password)
        
        # Update password
        user = await self.repository.update_user(
            user,
            password_hash=new_password_hash,
        )
        
        # Revoke all other sessions
        await self.repository.revoke_all_sessions(user.id)
        
        logger.info(f"Password changed for user: {user.email}")
        return user
    
    # Session validation
    async def validate_session(self, token_hash: str) -> Optional[UserSession]:
        """Validate a session token."""
        session = await self.repository.get_session_by_token_hash(token_hash)
        
        if not session:
            logger.debug("Session not found")
            return None
        
        # Check if revoked
        if session.revoked_at:
            logger.debug("Session revoked")
            return None
        
        # Check if expired
        now = datetime.now(timezone.utc)
        if session.expires_at and session.expires_at < now:
            logger.debug("Session expired")
            return None
        
        # Update last seen
        await self.repository.update_session_last_seen(session)
        
        return session
    
    async def get_user_sessions(self, user_id: UUID) -> list[UserSession]:
        """Get all active sessions for a user."""
        return await self.repository.get_active_sessions(user_id)


# Helper imports
from sqlalchemy import func