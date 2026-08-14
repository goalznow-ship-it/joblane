"""
CSRF protection utilities.

Provides CSRF token generation and validation.
"""

from fastapi import Request, HTTPException
from app.auth.exceptions import AuthCSRFInvalid
import secrets
import logging

logger = logging.getLogger(__name__)


async def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


async def validate_csrf_token(
    request: Request,
    csrf_token: str,
) -> bool:
    """Validate CSRF token."""
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return True
    
    if not csrf_token:
        logger.warning("CSRF token missing")
        raise AuthCSRFInvalid()
    
    # In a real implementation, we would validate against a stored token
    # For now, we just check that it's present and not empty
    if not csrf_token.strip():
        logger.warning("CSRF token empty")
        raise AuthCSRFInvalid()
    
    return True