"""
Email service for Joblane.

Implements the transactional outbox pattern:
- Emails are enqueued as rows in the same DB transaction as the business event
- A background loop (main.py) polls PENDING rows and delivers via SMTP
- Failed sends retry with exponential backoff up to max_attempts
- Token-bearing payload values are encrypted with Fernet (never stored raw)
"""

import asyncio
import base64
import hashlib
import html
import logging
import smtplib
import socket
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cryptography.fernet import Fernet

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.email.models import EmailOutbox, EmailOutboxStatus

logger = logging.getLogger(__name__)

# Payload keys whose values contain secrets and must be encrypted at rest
TOKEN_FIELDS = {"token", "verification_token", "reset_token", "password", "new_password"}

# Templates that exist
TEMPLATES = {"verify_email", "password_reset", "password_changed"}

_ENCRYPT_PREFIX = "enc:v1:"


def _fernet() -> Fernet:
    """Derive a stable Fernet key from the app secret."""
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.secret_key.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_value(value: str) -> str:
    """Encrypt a sensitive value for storage in the outbox payload."""
    return _ENCRYPT_PREFIX + _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_value(encrypted: str) -> str:
    """Decrypt a value previously encrypted with encrypt_value."""
    if encrypted.startswith(_ENCRYPT_PREFIX):
        encrypted = encrypted[len(_ENCRYPT_PREFIX):]
    return _fernet().decrypt(encrypted.encode("utf-8")).decode("utf-8")


def _maybe_decrypt(value) -> str:
    if isinstance(value, str) and value.startswith(_ENCRYPT_PREFIX):
        return decrypt_value(value[len(_ENCRYPT_PREFIX):])
    return value


async def enqueue_email(
    db: AsyncSession,
    recipient: str,
    template: str,
    subject: str,
    context: dict,
) -> EmailOutbox:
    """Create an outbox row in the caller's transaction (atomic with business event)."""
    if template not in TEMPLATES:
        raise ValueError(f"Unknown email template: {template}")
    payload = {}
    for key, value in context.items():
        if key in TOKEN_FIELDS and value is not None:
            payload[key] = encrypt_value(str(value))
        else:
            payload[key] = value
    row = EmailOutbox(
        recipient=recipient,
        template=template,
        subject=subject,
        payload=payload,
        max_attempts=settings.mail_max_attempts,
    )
    db.add(row)
    await db.flush()
    logger.info("Email queued: template=%s to=%s", template, recipient)
    return row


async def queue_verification_email(
    db: AsyncSession,
    email: str,
    verification_token: str,
) -> EmailOutbox:
    """Queue a verification email (24h expiry)."""
    return await enqueue_email(
        db,
        recipient=email,
        template="verify_email",
        subject="Joblane — E-poçt ünvanını təsdiqlə",
        context={
            "user_email": email,
            "verification_token": verification_token,
            "expires_in_hours": 24,
        },
    )


async def queue_password_reset_email(
    db: AsyncSession,
    email: str,
    reset_token: str,
) -> EmailOutbox:
    """Queue a password reset email (1h expiry)."""
    return await enqueue_email(
        db,
        recipient=email,
        template="password_reset",
        subject="Joblane — Şifrənin bərpası",
        context={
            "user_email": email,
            "reset_token": reset_token,
            "expires_in_hours": 1,
        },
    )


async def queue_password_changed_notification(
    db: AsyncSession,
    email: str,
) -> EmailOutbox:
    """Queue a password-changed notification email."""
    return await enqueue_email(
        db,
        recipient=email,
        template="password_changed",
        subject="Joblane — Şifrəniz dəyişdirildi",
        context={"user_email": email},
    )


# ---------------------------------------------------------------------------
# Template rendering
# ---------------------------------------------------------------------------

def _render(template: str, context: dict) -> tuple[str, str, str]:
    """Return (subject, html_body, text_body)."""
    base = settings.app_public_url.rstrip("/")
    email = html.escape(str(context.get("user_email", "")))
    if template == "verify_email":
        token = str(context["verification_token"])
        link = f"{base}/auth/verify-email?token={token}"
        title = "E-poçt ünvanını təsdiqlə"
        text = (
            f"Hörmətli istifadəçi,\n\n"
            f"Joblane hesabınız üçün qeydiyyatdan keçdiniz. E-poçt ünvanınızı təsdiqləmək üçün "
            f"aşağıdakı linki izləyin:\n\n{link}\n\n"
            f"Bu link 24 saat ərzində etibarlıdır. Əgər siz qeydiyyatdan keçməmisinizsə, bu mesajı nəzərə almayın.\n\n"
            f"Joblane komandası"
        )
        html_body = _layout(
            title,
            f"<p>Hörmətli istifadəçi,</p>"
            f"<p>Joblane hesabınız üçün qeydiyyatdan keçdiniz. E-poçt ünvanınızı təsdiqləmək üçün "
            f"aşağıdakı düyməni sıxın:</p>"
            f"<p style='text-align:center'><a href='{html.escape(link)}' style='background:#0f766e;color:#fff;"
            f"padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block'>E-poçtu təsdiqlə</a></p>"
            f"<p><small>Bu link 24 saat ərzində etibarlıdır. Əgər siz qeydiyyatdan keçməmisinizsə, "
            f"bu mesajı nəzərə almayın.</small></p>"
        )
        return _mail_subject("E-poçt ünvanını təsdiqlə"), html_body, text

    if template == "password_reset":
        token = str(context["reset_token"])
        link = f"{base}/auth/reset-password?token={token}"
        title = "Şifrənin bərpası"
        text = (
            f"Hörmətli istifadəçi,\n\n"
            f"Şifrənizi bərpa etmək üçün aşağıdakı linki izləyin:\n\n{link}\n\n"
            f"Bu link 1 saat ərzində etibarlıdır. Əgər siz şifrə bərpası tələb etməmisinizsə, bu mesajı nəzərə almayın.\n\n"
            f"Joblane komandası"
        )
        html_body = _layout(
            title,
            f"<p>Hörmətli istifadəçi,</p>"
            f"<p>Şifrənizi bərpa etmək üçün aşağıdakı düyməni sıxın:</p>"
            f"<p style='text-align:center'><a href='{html.escape(link)}' style='background:#0f766e;color:#fff;"
            f"padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block'>Şifrəni bərpa et</a></p>"
            f"<p><small>Bu link 1 saat ərzində etibarlıdır. Əgər siz şifrə bərpası tələb etməmisinizsə, "
            f"bu mesajı nəzərə almayın.</small></p>"
        )
        return _mail_subject("Şifrənin bərpası"), html_body, text

    if template == "password_changed":
        title = "Şifrəniz dəyişdirildi"
        text = (
            f"Hörmətli istifadəçi,\n\n"
            f"Joblane hesabınızın şifrəsi uğurla dəyişdirildi. Əgər bu əməliyyatı siz etməmisinizsə, "
            f"dərhal hesab təhlükəsizliyi səhifəsindən bütün sessiyaları ləğv edin və dəstək ilə əlaqə saxlayın.\n\n"
            f"Joblane komandası"
        )
        html_body = _layout(
            title,
            f"<p>Hörmətli istifadəçi,</p>"
            f"<p>Joblane hesabınızın şifrəsi uğurla dəyişdirildi. Əgər bu əməliyyatı siz etməmisinizsə, "
            f"dərhal <a href='{html.escape(base)}/account/security'>hesab təhlükəsizliyi</a> səhifəsindən "
            f"bütün sessiyaları ləğv edin və dəstək ilə əlaqə saxlayın.</p>"
        )
        return _mail_subject("Şifrəniz dəyişdirildi"), html_body, text

    raise ValueError(f"Unknown email template: {template}")


def _mail_subject(title: str) -> str:
    return f"Joblane — {title}"


def _layout(title: str, body_html: str) -> str:
    return (
        "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;'>"
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:24px 0'>"
        "<tr><td align='center'>"
        "<table role='presentation' width='560' cellpadding='0' cellspacing='0' style='background:#ffffff;"
        "border-radius:12px;overflow:hidden;border:1px solid #e2e8f0'>"
        "<tr><td style='background:#0f172a;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold'>Joblane</td></tr>"
        f"<tr><td style='padding:28px;color:#0f172a;font-size:15px;line-height:1.6'>"
        f"<h2 style='margin:0 0 16px;font-size:18px;color:#0f172a'>{html.escape(title)}</h2>{body_html}</td></tr>"
        "<tr><td style='background:#f8fafc;padding:14px 28px;color:#64748b;font-size:12px'>"
        "© 2026 Joblane. Bu mesaj avtomatik göndərilib, cavab verməyin.</td></tr>"
        "</table></td></tr></table></body></html>"
    )


# ---------------------------------------------------------------------------
# SMTP delivery
# ---------------------------------------------------------------------------

def _error_code(exc: Exception) -> str:
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "SMTP_AUTH_ERROR"
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return "SMTP_SENDER_REFUSED"
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "SMTP_RECIPIENT_REFUSED"
    if isinstance(exc, socket.timeout):
        return "SMTP_TIMEOUT"
    if isinstance(exc, (ConnectionRefusedError, OSError)):
        return "SMTP_CONNECT_FAILED"
    if isinstance(exc, smtplib.SMTPException):
        return "SMTP_ERROR"
    return "UNKNOWN"


def _smtp_send(message: EmailMessage) -> None:
    """Synchronously send a message via SMTP (runs in a worker thread)."""
    if settings.mail_use_ssl:
        server = smtplib.SMTP_SSL(settings.mail_host, settings.mail_port, timeout=settings.mail_timeout)
    else:
        server = smtplib.SMTP(settings.mail_host, settings.mail_port, timeout=settings.mail_timeout)
    with server:
        server.ehlo()
        if settings.mail_use_tls and not settings.mail_use_ssl:
            server.starttls()
            server.ehlo()
        if settings.mail_username:
            server.login(settings.mail_username, settings.mail_password or "")
        server.send_message(message)


def _build_message(row: EmailOutbox) -> EmailMessage:
    context = {key: _maybe_decrypt(value) for key, value in (row.payload or {}).items()}
    subject, html_body, text_body = _render(row.template, context)
    message = EmailMessage()
    message["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
    message["To"] = row.recipient
    message["Subject"] = subject
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    return message


async def send_due_emails(batch_size: int = 20) -> int:
    """Deliver due outbox rows. Returns number of emails sent. Safe to call in tests."""
    if not settings.mail_enabled:
        return 0
    sent = 0
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(EmailOutbox)
            .where(
                EmailOutbox.status.in_([EmailOutboxStatus.PENDING, EmailOutboxStatus.SENDING]),
                EmailOutbox.next_attempt_at <= now,
            )
            .order_by(EmailOutbox.created_at.asc())
            .limit(batch_size)
        )
        rows = result.scalars().all()
        for row in rows:
            row.status = EmailOutboxStatus.SENDING
            await db.commit()
            try:
                message = _build_message(row)
                await asyncio.to_thread(_smtp_send, message)
                row.status = EmailOutboxStatus.SENT
                row.sent_at = datetime.now(timezone.utc)
                row.last_error_code = None
                row.last_error_detail = None
                sent += 1
                logger.info("Email sent: template=%s to=%s", row.template, row.recipient)
            except Exception as exc:  # noqa: BLE001 - delivery must never crash the worker
                row.attempt_count += 1
                row.last_error_code = _error_code(exc)
                row.last_error_detail = str(exc)[:500]
                if row.attempt_count >= row.max_attempts:
                    row.status = EmailOutboxStatus.FAILED
                    logger.error(
                        "Email permanently failed: template=%s to=%s code=%s",
                        row.template, row.recipient, row.last_error_code,
                    )
                else:
                    row.status = EmailOutboxStatus.PENDING
                    row.next_attempt_at = now + timedelta(
                        seconds=settings.mail_retry_backoff_seconds * row.attempt_count
                    )
                    logger.warning(
                        "Email send failed (attempt %s/%s): template=%s to=%s code=%s",
                        row.attempt_count, row.max_attempts, row.template, row.recipient, row.last_error_code,
                    )
            await db.commit()
    return sent


async def email_sender_loop() -> None:
    """Background delivery loop started by main.py when mail is enabled."""
    if not settings.mail_enabled:
        return
    logger.info("Email sender loop started (interval=%ss)", settings.mail_poll_interval_seconds)
    while True:
        try:
            await send_due_emails()
        except Exception as exc:  # noqa: BLE001 - never crash the loop
            logger.error("Email sender loop error: %s", exc)
        await asyncio.sleep(settings.mail_poll_interval_seconds)