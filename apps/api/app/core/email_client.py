"""
Email client for API to queue emails via Celery worker.
"""

from celery import Celery
from app.core.config import settings

# Create Celery client for sending tasks to worker
celery_client = Celery(
    "joblane_api",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

# Configure client
celery_client.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Task names (must match worker task names)
SEND_VERIFICATION_EMAIL = "app.tasks.email_tasks.send_verification_email"
SEND_PASSWORD_RESET_EMAIL = "app.tasks.email_tasks.send_password_reset_email"
SEND_PASSWORD_CHANGED_NOTIFICATION = "app.tasks.email_tasks.send_password_changed_notification"


async def queue_verification_email(email: str, verification_token: str) -> None:
    """Queue verification email for async sending."""
    try:
        celery_client.send_task(
            SEND_VERIFICATION_EMAIL,
            args=[email, verification_token],
        )
    except Exception as e:
        # Log but don't fail the request - email is best effort
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to queue verification email for {email}: {e}")


async def queue_password_reset_email(email: str, reset_token: str) -> None:
    """Queue password reset email for async sending."""
    try:
        celery_client.send_task(
            SEND_PASSWORD_RESET_EMAIL,
            args=[email, reset_token],
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to queue password reset email for {email}: {e}")


async def queue_password_changed_notification(email: str) -> None:
    """Queue password changed notification email."""
    try:
        celery_client.send_task(
            SEND_PASSWORD_CHANGED_NOTIFICATION,
            args=[email],
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to queue password changed notification for {email}: {e}")