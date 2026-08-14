from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
from typing import Optional
import secrets
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_env: str = "development"
    app_name: str = "Joblane"
    app_debug: bool = True
    secret_key: str = secrets.token_urlsafe(32)

    # Server
    web_url: AnyHttpUrl = "http://localhost:3000"
    api_url: AnyHttpUrl = "http://localhost:8000"
    worker_url: AnyHttpUrl = "http://localhost:8001"

    # Database
    database_url: Optional[str] = os.getenv('DATABASE_URL')
    database_test_url: Optional[str] = os.getenv('DATABASE_TEST_URL')

    # Redis
    redis_url: Optional[str] = os.getenv('REDIS_URL')

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # Password hashing
    bcrypt_rounds: int = 12

    # Storage
    s3_endpoint: Optional[str] = os.getenv('S3_ENDPOINT')
    s3_access_key: Optional[str] = os.getenv('S3_ACCESS_KEY')
    s3_secret_key: Optional[str] = os.getenv('S3_SECRET_KEY')
    s3_bucket: str = "joblane"
    s3_region: str = "us-east-1"
    s3_secure: bool = False

    # Email
    mail_host: str = "mailpit"
    mail_port: int = 1025
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: str = "no-reply@joblane.local"
    mail_from_name: str = "Joblane"

    # AI
    ai_provider: str = "none"
    ai_api_key: Optional[str] = None

    # Rate limiting
    rate_limit: int = 1000
    rate_limit_window: int = 60

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8000"

    # Session
    session_cookie_name: str = "joblane_session"
    session_cookie_domain: str = "localhost"
    session_cookie_secure: bool = False
    session_cookie_http_only: bool = True
    session_cookie_same_site: str = "lax"

    # Security headers
    secure_hsts_seconds: int = 31536000
    secure_hsts_include_subdomains: bool = True
    secure_hsts_preload: bool = True
    secure_content_type_nosniff: bool = True
    secure_x_frame_options: str = "DENY"
    secure_x_content_type_options: str = "nosniff"
    referrer_policy: str = "no-referrer-when-downgrade"



    @validator("allowed_origins")
    def validate_allowed_origins(cls, v: str) -> str:
        """Validate that allowed origins are comma-separated URLs."""
        origins = v.split(",")
        for origin in origins:
            if not origin.strip():
                raise ValueError("Allowed origins cannot be empty")
        return v

    @validator("secret_key")
    def validate_secret_key(cls, v: str) -> str:
        """Ensure secret key is not empty."""
        if not v:
            raise ValueError("Secret key cannot be empty")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()