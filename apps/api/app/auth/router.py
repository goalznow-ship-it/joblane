"""
FastAPI router for authentication endpoints.

Defines all authentication-related HTTP routes.
"""

from fastapi import APIRouter, Depends, Request, Response, status, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
import logging

from app.core.database import get_db
from app.auth.service import AuthService
from app.auth.schemas import (
    RegisterRequest,
    RegisterResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    UserMeResponse,
)
from app.auth.models import User, UserSession
from app.auth.dependencies import (
    get_current_user,
    get_current_session,
    csrf_protection,
    rate_limit_login,
    rate_limit_forgot_password,
    rate_limit_resend_verification,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# Session cookie management

def set_session_cookie(response: Response, session_token: str) -> Response:
    """Set HttpOnly session cookie."""
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_same_site,
        path="/",
        max_age=settings.session_ttl_seconds,
    )
    return response


def clear_session_cookie(response: Response) -> Response:
    """Clear session cookie."""
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
    )
    return response


# Registration
@router.post("/register", response_model=RegisterResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """Register a new user."""
    auth_service = AuthService(db)
    
    try:
        user, verification_token = await auth_service.register_user(
            email=request.email,
            password=request.password,
            onboarding_intent=request.onboarding_intent,
        )
        
        # In a real implementation, we would queue an email task here
        # For now, we just log the token for development
        logger.info(f"Verification token for {request.email}: {verification_token}")
        
        return RegisterResponse()
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


# Email verification
@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> VerifyEmailResponse:
    """Verify user email."""
    auth_service = AuthService(db)
    
    try:
        user = await auth_service.verify_email(request.token)
        return VerifyEmailResponse(
            success=True,
            message="Email verified successfully",
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Email verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed",
        )


# Resend verification
@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    request: ResendVerificationRequest,
    _: bool = Depends(rate_limit_resend_verification),
    db: AsyncSession = Depends(get_db),
) -> ResendVerificationResponse:
    """Resend verification email."""
    auth_service = AuthService(db)
    
    try:
        user = await auth_service.resend_verification_email(request.email)
        
        if not user:
            # Don't reveal user doesn't exist
            return ResendVerificationResponse(
                message="If an account exists for this email, verification instructions will be resent.",
            )
        
        # In a real implementation, we would queue an email task here
        logger.info(f"Resend verification email for {request.email}")
        
        return ResendVerificationResponse(
            message="Verification email resent",
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Resend verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email",
        )


# Login
@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    response: Response,
    _: bool = Depends(rate_limit_login),
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Login user and create session."""
    auth_service = AuthService(db)
    
    try:
        user, session = await auth_service.login_user(
            email=request.email,
            password=request.password,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
        )
        
        # Set session cookie
        response = set_session_cookie(response, session_token=generate_session_token())
        
        return LoginResponse()
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )


# Current user
@router.get("/me", response_model=UserMeResponse)
async def current_user(
    user: Annotated[User, Depends(get_current_user)],
    _: bool = Depends(csrf_protection),
) -> UserMeResponse:
    """Get current authenticated user."""
    return UserMeResponse(
        id=user.id,
        email=user.email,
        email_verified=user.email_verified_at is not None,
        status=user.status.value,
        created_at=user.created_at,
    )


# Logout
@router.post("/logout", response_model=LogoutResponse)
async def logout(
    session: Annotated[UserSession, Depends(get_current_session)],
    response: Response,
    _: bool = Depends(csrf_protection),
    db: AsyncSession = Depends(get_db),
) -> LogoutResponse:
    """Logout current user."""
    auth_service = AuthService(db)
    
    try:
        await auth_service.logout_user(session)
        response = clear_session_cookie(response)
        return LogoutResponse()
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed",
        )


# Logout all devices
@router.post("/logout-all", response_model=LogoutResponse)
async def logout_all(
    user: Annotated[User, Depends(get_current_user)],
    response: Response,
    _: bool = Depends(csrf_protection),
    db: AsyncSession = Depends(get_db),
) -> LogoutResponse:
    """Logout from all devices."""
    auth_service = AuthService(db)
    
    try:
        await auth_service.logout_all_sessions(user.id)
        response = clear_session_cookie(response)
        return LogoutResponse()
    except Exception as e:
        logger.error(f"Logout all failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout all failed",
        )


# Forgot password
@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    _: bool = Depends(rate_limit_forgot_password),
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """Initiate password reset."""
    auth_service = AuthService(db)
    
    try:
        user = await auth_service.forgot_password(request.email)
        
        if user:
            # In a real implementation, we would queue an email task here
            logger.info(f"Password reset token for {request.email}")
        
        return ForgotPasswordResponse()
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Forgot password failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request",
        )


# Reset password
@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    """Reset password using token."""
    auth_service = AuthService(db)
    
    try:
        user = await auth_service.reset_password(
            token=request.token,
            new_password=request.new_password,
        )
        
        return ResetPasswordResponse()
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed",
        )


# Account router
account_router = APIRouter(prefix="/api/v1/account", tags=["account"])


@account_router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    _: bool = Depends(csrf_protection),
    db: AsyncSession = Depends(get_db),
) -> ChangePasswordResponse:
    """Change password for authenticated user."""
    auth_service = AuthService(db)
    
    try:
        await auth_service.change_password(
            user=user,
            current_password=request.current_password,
            new_password=request.new_password,
        )
        
        return ChangePasswordResponse()
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Password change failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed",
        )


# Import helper functions
from app.auth.repository import generate_session_token