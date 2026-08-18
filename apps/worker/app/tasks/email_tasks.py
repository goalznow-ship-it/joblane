"""
Email tasks for Celery worker.
Handles sending verification, password reset, and notification emails via SMTP.
"""

from celery import Celery
from apps.worker.app.core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)


def get_celery_app() -> Celery:
    """Get or create Celery app instance."""
    from apps.worker.main import celery
    return celery


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None,
) -> bool:
    """
    Send an email via SMTP (Mailpit in development).
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email body
        text_content: Plain text email body (optional)
        
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Add text part if provided
        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        
        # Add HTML part
        msg.attach(MIMEText(html_content, "html"))
        
        # Send via SMTP
        with smtplib.SMTP(settings.mail_host, settings.mail_port) as server:
            if settings.mail_username and settings.mail_password:
                server.login(settings.mail_username, settings.mail_password)
            server.send_message(msg)
        
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


@get_celery_app().task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_kwargs={"max_retries": 3},
)
def send_verification_email(self, email: str, verification_token: str) -> bool:
    """
    Send email verification email.
    
    Args:
        email: User's email address
        verification_token: Raw verification token (not hashed)
        
    Returns:
        True if sent successfully
    """
    # Build verification URL
    verify_url = f"{settings.web_url}/verify-email?token={verification_token}"
    
    subject = "Verify your Joblane email"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Joblane!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Thanks for signing up for Joblane! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email</a>
            </div>
            <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 13px; color: #6c757d; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px;">{verify_url}</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 25px 0;">
            <p style="font-size: 13px; color: #6c757d; margin: 0;">This link will expire in 24 hours. If you didn't create an account, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
            <p>© 2024 Joblane. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
Welcome to Joblane!

Thanks for signing up! Please verify your email address by visiting:

{verify_url}

This link will expire in 24 hours. If you didn't create an account, please ignore this email.

© 2024 Joblane. All rights reserved.
"""
    
    return send_email(email, subject, html_content, text_content)


@get_celery_app().task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_kwargs={"max_retries": 3},
)
def send_password_reset_email(self, email: str, reset_token: str) -> bool:
    """
    Send password reset email.
    
    Args:
        email: User's email address
        reset_token: Raw reset token (not hashed)
        
    Returns:
        True if sent successfully
    """
    # Build reset URL
    reset_url = f"{settings.web_url}/reset-password?token={reset_token}"
    
    subject = "Reset your Joblane password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">You requested a password reset for your Joblane account. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 13px; color: #6c757d; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px;">{reset_url}</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 25px 0;">
            <p style="font-size: 13px; color: #6c757d; margin: 0;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
            <p>© 2024 Joblane. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
Reset Your Joblane Password

You requested a password reset. Please visit:

{reset_url}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned.

© 2024 Joblane. All rights reserved.
"""
    
    return send_email(email, subject, html_content, text_content)


@get_celery_app().task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_kwargs={"max_retries": 3},
)
def send_password_changed_notification(self, email: str) -> bool:
    """
    Send password changed security notification.
    
    Args:
        email: User's email address
        
    Returns:
        True if sent successfully
    """
    subject = "Your Joblane password was changed"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Changed</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Your Joblane account password was successfully changed.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 25px 0;">
            <p style="font-size: 13px; color: #6c757d; margin: 0;">If you didn't make this change, please contact support immediately.</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
            <p>© 2024 Joblane. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
Password Changed

Your Joblane account password was successfully changed.

If you didn't make this change, please contact support immediately.

© 2024 Joblane. All rights reserved.
"""
    
    return send_email(email, subject, html_content, text_content)