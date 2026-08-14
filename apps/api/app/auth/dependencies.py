"""
FastAPI dependencies for authentication.

Provides reusable dependency functions for:
- session validation
- current user retrieval
- CSRF protection
- rate limiting
"""

from fastapi import Depends, Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Annotated
from uuid import UUID
import logging
from datetime import datetime, timedelta

from app.core.database import get_db
from app.auth.service import AuthService
from app.auth.models import User, UserSession
from app.auth.exceptions import (
    AuthSessionExpired,
    AuthSessionRevoked,
    AuthSessionNotFound,
    AuthCSRFInvalid,
    AuthRateLimited,
)
from app.core.config import settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


# Security scheme for session cookie
class SessionCookieBearer(HTTPBearer):
    """Extract session token from HttpOnly cookie."""
    
    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        session_token = request.cookies.get(settings.session_cookie_name)
        if not session_token:
            return None
        
        return HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=session_token,
        )


# CSRF token dependency
async def get_csrf_token(request: Request) -> Optional[str]:
    """Extract CSRF token from header."""
    return request.headers.get("X-CSRF-Token")


# Rate limiter
async def rate_limiter(
    key: str,
    limit: int = 10,
    window: int = 60,
) -> bool:
    """Rate limiter using Redis."""
    redis_client = await get_redis()
    current = await redis_client.get(key)
    if current and int(current) >= limit:
        return False
    
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    await pipe.execute()
    return True


# Session validation
async def get_current_session(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(SessionCookieBearer())],
    db: AsyncSession = Depends(get_db),
) -> UserSession:
    """Validate session token and return session."""
    if not credentials:
        logger.debug("No session token provided")
        raise AuthSessionNotFound()
    
    auth_service = AuthService(db)
    session = await auth_service.validate_session(credentials.credentials)
    
    if not session:
        logger.debug("Invalid session token")
        raise AuthSessionExpired()
    
    return session


# Current user
async def get_current_user(
    session: Annotated[UserSession, Depends(get_current_session)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user."""
    auth_service = AuthService(db)
    user = await auth_service.repository.get_user_by_id(session.user_id)
    
    if not user:
        logger.error(f"Session {session.id} references non-existent user {session.user_id}")
        raise AuthSessionNotFound()
    
    return user


# CSRF protection for unsafe methods
async def csrf_protection(
    request: Request,
    session: Annotated[UserSession, Depends(get_current_session)],
    csrf_token: Annotated[Optional[str], Depends(get_csrf_token)],
) -> bool:
    """CSRF protection for unsafe HTTP methods."""
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return True
    
    if not csrf_token:
        logger.warning("CSRF token missing")
        raise AuthCSRFInvalid()
    
    # In a real implementation, we would validate the CSRF token against a stored value
    # For now, we just check that it's present and not empty
    if not csrf_token.strip():
        logger.warning("CSRF token empty")
        raise AuthCSRFInvalid()
    
    return True


# Rate limiting for auth endpoints
async def rate_limit_login(
    request: Request,
) -> bool:
    """Rate limit for login endpoint."""
    ip = request.client.host
    key = f"login_rate_limit:{ip}"
    
    if not await rate_limiter(key, limit=5, window=60):
        logger.warning(f"Login rate limit exceeded for IP: {ip}")
        raise AuthRateLimited(retry_after=60)
    
    return True


async def rate_limit_forgot_password(
    request: Request,
) -> bool:
    """Rate limit for forgot password endpoint."""
    ip = request.client.host
    key = f"forgot_password_rate_limit:{ip}"
    
    if not await rate_limiter(key, limit=3, window=3600):
        logger.warning(f"Forgot password rate limit exceeded for IP: {ip}")
        raise AuthRateLimited(retry_after=3600)
    
    return True


async def rate_limit_resend_verification(
    request: Request,
) -> bool:
    """Rate limit for resend verification endpoint."""
    ip = request.client.host
    key = f"resend_verification_rate_limit:{ip}"
    
    if not await rate_limiter(key, limit=3, window=3600):
        logger.warning(f"Resend verification rate limit exceeded for IP: {ip}")
        raise AuthRateLimited(retry_after=3600)
    
    return True


# Require verified user
async def require_verified_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require email-verified user."""
    if not user.email_verified_at:
        logger.warning(f"Unverified user {user.id} attempted to access protected endpoint")
        raise AuthEmailNotVerified()
    
    return user