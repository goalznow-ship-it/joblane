"""
Rate limiting utilities for authentication endpoints.

Uses Redis for distributed rate limiting.
"""

from fastapi import Request, HTTPException
from app.core.redis import get_redis
from app.auth.exceptions import AuthRateLimited
import logging

logger = logging.getLogger(__name__)


async def rate_limiter(
    request: Request,
    key_prefix: str,
    limit: int = 10,
    window: int = 60,
) -> bool:
    """Generic rate limiter."""
    ip = request.client.host if request.client else "unknown"
    key = f"{key_prefix}:{ip}"
    
    redis_client = await get_redis()
    current = await redis_client.get(key)
    if current and int(current) >= limit:
        logger.warning(f"Rate limit exceeded for {key_prefix}: {ip}")
        raise AuthRateLimited(retry_after=window)
    
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    await pipe.execute()
    return True


async def login_rate_limiter(request: Request) -> bool:
    """Rate limiter for login endpoint."""
    return await rate_limiter(request, "login_rate_limit", limit=5, window=60)


async def forgot_password_rate_limiter(request: Request) -> bool:
    """Rate limiter for forgot password endpoint."""
    return await rate_limiter(request, "forgot_password_rate_limit", limit=3, window=3600)


async def resend_verification_rate_limiter(request: Request) -> bool:
    """Rate limiter for resend verification endpoint."""
    return await rate_limiter(request, "resend_verification_rate_limit", limit=3, window=3600)