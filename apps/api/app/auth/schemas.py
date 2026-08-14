"""
Pydantic schemas for auth domain.

These schemas define the API contracts for authentication operations.
They ensure type safety and proper data validation.
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    """Base user schema with common fields."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: UUID
    email: EmailStr
    email_verified: bool
    status: str
    created_at: datetime


class UserPublic(UserBase):
    """Public user information (safe to expose)."""
    pass


class UserMeResponse(UserPublic):
    """Response for GET /auth/me endpoint."""
    pass


# Registration schemas
class RegisterRequest(BaseModel):
    """Request schema for user registration."""
    model_config = ConfigDict(from_attributes=True)
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")
    onboarding_intent: Optional[Literal["candidate", "employer"]] = Field(
        None, 
        description="Optional onboarding intent (does not set permanent role)"
    )


class RegisterResponse(BaseModel):
    """Response schema for successful registration."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = "Registration successful. Please check your email to verify your account."
    email_verified: bool = False


# Email verification schemas
class VerifyEmailRequest(BaseModel):
    """Request schema for email verification."""
    model_config = ConfigDict(from_attributes=True)
    
    token: str = Field(..., description="Email verification token")


class VerifyEmailResponse(BaseModel):
    """Response schema for email verification."""
    model_config = ConfigDict(from_attributes=True)
    
    success: bool
    message: str


# Resend verification schemas
class ResendVerificationRequest(BaseModel):
    """Request schema for resending verification email."""
    model_config = ConfigDict(from_attributes=True)
    
    email: EmailStr = Field(..., description="User email address")


class ResendVerificationResponse(BaseModel):
    """Response schema for resending verification email."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str


# Login schemas
class LoginRequest(BaseModel):
    """Request schema for user login."""
    model_config = ConfigDict(from_attributes=True)
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class LoginResponse(BaseModel):
    """Response schema for successful login."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = "Login successful"


# Logout schemas
class LogoutResponse(BaseModel):
    """Response schema for logout."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = "Logged out successfully"


# Forgot password schemas
class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password."""
    model_config = ConfigDict(from_attributes=True)
    
    email: EmailStr = Field(..., description="User email address")


class ForgotPasswordResponse(BaseModel):
    """Response schema for forgot password."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = "If an account exists for this email, password reset instructions will be sent."


# Reset password schemas
class ResetPasswordRequest(BaseModel):
    """Request schema for password reset."""
    model_config = ConfigDict(from_attributes=True)
    
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")


class ResetPasswordResponse(BaseModel):
    """Response schema for successful password reset."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = "Password reset successful. You can now login with your new password."


# Change password schemas
class ChangePasswordRequest(BaseModel):
    """Request schema for changing password."""
    model_config = ConfigDict(from_attributes=True)
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class ChangePasswordResponse(BaseModel):
    """Response schema for successful password change."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = "Password changed successfully"


# Session schemas
class SessionPublic(BaseModel):
    """Public session information."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    revoked: bool


class CurrentSessionResponse(BaseModel):
    """Response for current session information."""
    model_config = ConfigDict(from_attributes=True)
    
    session: SessionPublic
    user: UserPublic


class ProtectedEndpointResponse(BaseModel):
    """Response for protected endpoint access."""
    model_config = ConfigDict(from_attributes=True)
    
    message: str
    user: UserPublic
