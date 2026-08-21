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
from typing import Optional

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
TEMPLATES = {
    "verify_email",
    "password_reset",
    "password_changed",
    "team_invitation",
    "payment_receipt",
    "plan_activated",
    "payment_failed",
    "promotion_purchased",
}

BILLING_TEMPLATES = {"payment_receipt", "plan_activated", "payment_failed", "promotion_purchased"}

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


def _billing_rows_html(rows: list) -> str:
    trs = "".join(
        f"<tr><td style='padding:6px 10px;border-bottom:1px solid #e2e8f0'>{html.escape(str(r.get('description', '')))}</td>"
        f"<td align='right' style='padding:6px 10px;border-bottom:1px solid #e2e8f0'>"
        f"{html.escape(str(r.get('amount', '')))} {html.escape(str(r.get('currency', '')))}</td></tr>"
        for r in rows
    )
    return (
        "<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:8px;"
        "border-collapse:collapse;font-size:13px;margin:12px 0'>"
        f"<tr><th align='left' style='padding:6px 10px;background:#f8fafc'>Məhsul</th>"
        f"<th align='right' style='padding:6px 10px;background:#f8fafc'>Məbləğ</th></tr>{trs}</table>"
    )


def _render_billing(template: str, context: dict) -> tuple[str, str, str]:
    """Render billing-related transactional emails. Never includes card data."""
    company = html.escape(str(context.get("company_name", "")))
    amount = html.escape(str(context.get("amount", "")))
    currency = html.escape(str(context.get("currency", "")))
    rows = context.get("rows") or []
    invoice_number = html.escape(str(context.get("invoice_number", "")))
    base = settings.app_public_url.rstrip("/")
    billing_url = f"{base}/employer/billing"

    if template == "payment_receipt":
        title = "Ödəniş qəbzi"
        body = (
            f"<p><strong>{company}</strong> üçün ödənişiniz uğurla həyata keçirildi.</p>"
            f"<p>Məbləğ: <strong>{amount} {currency}</strong>"
            + (f" &middot; Faktura: <strong>{invoice_number}</strong>" if invoice_number else "")
            + "</p>" + _billing_rows_html(rows)
            + f"<p>Fakturanı görmək üçün: <a href='{html.escape(billing_url)}'>{html.escape(billing_url)}</a></p>"
        )
        text = (
            f"Ödəniş qəbzi\n\n{company} üçün ödəniş uğurla tamamlandı.\n"
            f"Məbləğ: {amount} {currency}\n"
            + (f"Faktura: {invoice_number}\n" if invoice_number else "")
            + "\nJoblane komandası"
        )
        return _mail_subject("Ödəniş qəbzi"), _layout(title, body), text

    if template == "plan_activated":
        plan_name = html.escape(str(context.get("plan_name", "")))
        period_end = str(context.get("period_end", ""))
        credits_lines = "".join(
            f"<li>{html.escape(str(k))}: {html.escape(str(v))}</li>" for k, v in (context.get("credits") or {}).items()
        )
        body = (
            f"<p><strong>{company}</strong> üçün <strong>{plan_name}</strong> paketi aktivləşdirildi.</p>"
            + (f"<p>Dövrün sonu: {html.escape(period_end)}</p>" if period_end else "")
            + (f"<ul>{credits_lines}</ul>" if credits_lines else "")
            + f"<p><a href='{html.escape(billing_url)}'>Paketlər və kreditlər</a></p>"
        )
        text = (
            f"Paket aktivləşdirildi\n\n{plan_name} paketi {company} şirkəti üçün aktivdir.\n"
            f"Joblane komandası"
        )
        return _mail_subject(f"{plan_name} paketi aktivləşdirildi"), _layout(title, body), text

    if template == "payment_failed":
        description = html.escape(str(context.get("description", "")))
        body = (
            f"<p><strong>{company}</strong> üçün ödəniş uğursuz oldu.</p>"
            + (f"<p>{description}</p>" if description else "")
            + f"<p>Zəhmət olmasa yenidən cəhd edin: <a href='{html.escape(billing_url)}'>{html.escape(billing_url)}</a></p>"
        )
        text = (
            f"Ödəniş uğursuz oldu\n\n{description}\n\nJoblane komandası"
        )
        return _mail_subject("Ödəniş uğursuz oldu"), _layout(title, body), text

    if template == "promotion_purchased":
        product = html.escape(str(context.get("product", "")))
        job_title = html.escape(str(context.get("job_title", "")))
        ends_at = str(context.get("ends_at", ""))
        body = (
            f"<p><strong>{job_title}</strong> vakansiyası üçün <strong>{product}</strong> "
            f"promosyonu aktivləşdirildi.</p>"
            + (f"<p>Bitmə tarixi: {html.escape(ends_at)}</p>" if ends_at else "")
            + f"<p>Məbləğ: {amount} {currency}</p>"
        )
        text = f"Promosyon aktivləşdirildi\n\n{product} — {job_title}\nJoblane komandası"
        return _mail_subject("Promosyon aktivləşdirildi"), _layout(title, body), text

    raise ValueError(f"Unknown billing email template: {template}")


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
# Billing transactional emails (no card data, ever)
# ---------------------------------------------------------------------------

async def queue_payment_receipt_email(
    db: AsyncSession,
    email: str,
    *,
    company_name: str,
    amount,
    currency: str,
    invoice_number: str = "",
    rows: Optional[list] = None,
) -> EmailOutbox:
    return await enqueue_email(
        db,
        recipient=email,
        template="payment_receipt",
        subject="Joblane — Ödəniş qəbzi",
        context={
            "user_email": email,
            "company_name": company_name,
            "amount": str(amount),
            "currency": currency,
            "invoice_number": invoice_number,
            "rows": rows or [],
        },
    )


async def queue_plan_activated_email(
    db: AsyncSession,
    email: str,
    *,
    company_name: str,
    plan_name: str,
    period_end: str = "",
    credits: Optional[dict] = None,
) -> EmailOutbox:
    return await enqueue_email(
        db,
        recipient=email,
        template="plan_activated",
        subject="Joblane — Paket aktivləşdirildi",
        context={
            "user_email": email,
            "company_name": company_name,
            "plan_name": plan_name,
            "period_end": period_end,
            "credits": credits or {},
        },
    )


async def queue_payment_failed_email(
    db: AsyncSession,
    email: str,
    *,
    company_name: str,
    description: str = "",
) -> EmailOutbox:
    return await enqueue_email(
        db,
        recipient=email,
        template="payment_failed",
        subject="Joblane — Ödəniş uğursuz oldu",
        context={
            "user_email": email,
            "company_name": company_name,
            "description": description,
        },
    )


async def queue_promotion_purchased_email(
    db: AsyncSession,
    email: str,
    *,
    product: str,
    job_title: str,
    amount,
    currency: str,
    ends_at: str = "",
) -> EmailOutbox:
    return await enqueue_email(
        db,
        recipient=email,
        template="promotion_purchased",
        subject="Joblane — Promosyon aktivləşdirildi",
        context={
            "user_email": email,
            "product": product,
            "job_title": job_title,
            "amount": str(amount),
            "currency": currency,
            "ends_at": ends_at,
        },
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

    if template == "team_invitation":
        token = str(context.get("token", ""))
        company_name = html.escape(str(context.get("company_name", "")))
        role = html.escape(str(context.get("role", "")))
        invited_by_name = html.escape(str(context.get("invited_by_name", "")))
        expires_at = str(context.get("expires_at", ""))
        link = f"{base}/employer/invitations/accept?token={token}"
        title = f"Sizi {company_name} komandasına dəvət edirlər"
        text = (
            f"Hörmətli istifadəçi,\n\n"
            f"{invited_by_name} sizi {company_name} şirkətinin komandasına {role} rolunda dəvət edir.\n\n"
            f"Dəvəti qəbul etmək üçün aşağıdakı linki izləyin:\n\n{link}\n\n"
            f"Bu dəvət {expires_at} tarixinə qədər etibarlıdır.\n\n"
            f"Joblane komandası"
        )
        html_body = _layout(
            title,
            f"<p>Hörmətli istifadəçi,</p>"
            f"<p>{invited_by_name} sizi <strong>{company_name}</strong> şirkətinin komandasına "
            f"<strong>{role}</strong> rolunda dəvət edir.</p>"
            f"<p style='text-align:center'><a href='{html.escape(link)}' style='background:#0f766e;color:#fff;"
            f"padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block'>Dəvəti qəbul et</a></p>"
            f"<p><small>Bu dəvət {html.escape(expires_at)} tarixinə qədər etibarlıdır.</small></p>"
        )
        return _mail_subject(f"Sizi {company_name} komandasına dəvət edirlər"), html_body, text

    if template in BILLING_TEMPLATES:
        return _render_billing(template, context)

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