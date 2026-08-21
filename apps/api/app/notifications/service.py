"""
Notification service: creation and query operations.
"""

import logging
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications.models import Notification
from app.notifications.schemas import NotificationOut
from app.auth.exceptions import AuthException

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    type: str,
    title: str,
    message: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[Any] = None,
    action_url: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> Notification:
    """Create a notification in the caller's transaction."""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        action_url=action_url,
        metadata_json=metadata or {},
    )
    db.add(notification)
    await db.flush()
    logger.info("Notification created: user=%s type=%s", user_id, type)
    return notification


def _to_out(notification: Notification, unread_count: int) -> NotificationOut:
    return NotificationOut(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        entity_type=notification.entity_type,
        entity_id=notification.entity_id,
        action_url=notification.action_url,
        metadata_json=notification.metadata_json,
        read_at=notification.read_at,
        created_at=notification.created_at,
        is_read=notification.read_at is not None,
    )


async def unread_count(db: AsyncSession, user_id: UUID) -> int:
    """Number of unread notifications for a user."""
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
        )
    )
    return result.scalar() or 0


async def list_notifications(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> tuple[list[NotificationOut], int, int]:
    """List a user's notifications (newest first) with pagination."""
    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    total = (
        await db.execute(
            select(func.count(Notification.id)).where(Notification.user_id == user_id)
        )
    ).scalar() or 0
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.scalars().all()
    unread = await unread_count(db, user_id)
    items = [_to_out(n, unread) for n in rows]
    return items, total, unread


async def mark_read(db: AsyncSession, user_id: UUID, notification_id: UUID) -> Notification:
    """Mark a single notification as read (ownership enforced)."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise AuthException(
            detail="Notification not found",
            status_code=404,
        )
    if notification.read_at is None:
        notification.read_at = func.now()
        await db.flush()
    return notification


async def mark_all_read(db: AsyncSession, user_id: UUID) -> int:
    """Mark all of a user's notifications as read. Returns count updated."""
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=func.now())
    )
    await db.flush()
    return result.rowcount or 0


async def notify_company_members(
    db: AsyncSession,
    company_id: UUID,
    type: str,
    title: str,
    message: str,
    entity_type: str,
    entity_id: Optional[Any] = None,
    action_url: Optional[str] = None,
    roles: Optional[list] = None,
) -> int:
    """Notify active members of a company (optionally filtered by role)."""
    from app.admin.models import CompanyMembership, CompanyMembershipStatus

    query = (
        select(CompanyMembership.user_id)
        .where(
            CompanyMembership.company_id == company_id,
            CompanyMembership.status == CompanyMembershipStatus.ACTIVE,
        )
    )
    if roles:
        query = query.where(CompanyMembership.role.in_(roles))
    result = await db.execute(query)
    user_ids = result.scalars().all()
    for user_id in user_ids:
        await create_notification(
            db,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
        )
    return len(user_ids)