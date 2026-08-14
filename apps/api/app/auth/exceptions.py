"""
Auth domain exceptions.

These exceptions represent authentication-specific error conditions
and map to appropriate HTTP status codes.
"""

from fastapi import HTTPException, status


class AuthException(HTTPException):
    """Base authentication exception."""
    
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail={
            "error": {
                "code": self.__class__.__name__,
                "message": detail,
                "details": None
            }
        })


class AuthInvalidCredentials(AuthException):
    """Invalid email or password."""
    
    def __init__(self):
        super().__init__(
            detail="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthEmailNotVerified(AuthException):
    """Email not verified."""
    
    def __init__(self):
        super().__init__(
            detail="Email not verified. Please verify your email to continue.",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthSessionExpired(AuthException):
    """Session expired."""
    
    def __init__(self):
        super().__init__(
            detail="Session expired. Please login again.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthSessionRevoked(AuthException):
    """Session revoked."""
    
    def __init__(self):
        super().__init__(
            detail="Session revoked. Please login again.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthVerificationTokenInvalid(AuthException):
    """Verification token invalid."""
    
    def __init__(self):
        super().__init__(
            detail="Invalid verification token",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthVerificationTokenExpired(AuthException):
    """Verification token expired."""
    
    def __init__(self):
        super().__init__(
            detail="Verification token expired",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthVerificationTokenAlreadyUsed(AuthException):
    """Verification token already used."""
    
    def __init__(self):
        super().__init__(
            detail="Verification token already used",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthResetTokenInvalid(AuthException):
    """Reset token invalid."""
    
    def __init__(self):
        super().__init__(
            detail="Invalid reset token",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthResetTokenExpired(AuthException):
    """Reset token expired."""
    
    def __init__(self):
        super().__init__(
            detail="Reset token expired",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthResetTokenAlreadyUsed(AuthException):
    """Reset token already used."""
    
    def __init__(self):
        super().__init__(
            detail="Reset token already used",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthAccountSuspended(AuthException):
    """Account suspended."""
    
    def __init__(self):
        super().__init__(
            detail="Account suspended. Please contact support.",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthAccountBlocked(AuthException):
    """Account blocked."""
    
    def __init__(self):
        super().__init__(
            detail="Account blocked. Please contact support.",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthRateLimited(AuthException):
    """Rate limited."""
    
    def __init__(self, retry_after: int = 60):
        super().__init__(
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )


class AuthCSRFInvalid(AuthException):
    """CSRF token invalid."""
    
    def __init__(self):
        super().__init__(
            detail="Invalid CSRF token",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthSessionNotFound(AuthException):
    """Session not found."""
    
    def __init__(self):
        super().__init__(
            detail="Session not found",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


# Generic exceptions
class AuthValidationError(AuthException):
    """Validation error."""
    
    def __init__(self, detail: str):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)
