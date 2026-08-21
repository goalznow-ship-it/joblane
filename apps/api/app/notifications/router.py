"""
Notification API endpoints.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.models import User
from app.auth.dependencies import get_current_user, csrf_protection
from app.notifications import service as notification_service
from app.notifications.schemas import (
    NotificationListResponse,
    UnreadCountResponse,
    MarkReadResponse,
)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_my_notifications(
    user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    """List current user's notifications (newest first)."""
    items, total, unread = await notification_service.list_notifications(
        db, user.id, page=page, page_size=page_size
    )
    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def my_unread_count(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> UnreadCountResponse:
    """Get current user's unread notification count."""
    count = await notification_service.unread_count(db, user.id)
    return UnreadCountResponse(unread_count=count)


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_one_read(
    notification_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    _: bool = Depends(csrf_protection),
    db: AsyncSession = Depends(get_db),
) -> MarkReadResponse:
    """Mark a single notification as read."""
    await notification_service.mark_read(db, user.id, notification_id)
    count = await notification_service.unread_count(db, user.id)
    return MarkReadResponse(unread_count=count)


@router.post("/read-all", response_model=MarkReadResponse)
async def mark_all_read(
    user: Annotated[User, Depends(get_current_user)],
    _: bool = Depends(csrf_protection),
    db: AsyncSession = Depends(get_db),
) -> MarkReadResponse:
    """Mark all notifications as read."""
    await notification_service.mark_all_read(db, user.id)
    count = await notification_service.unread_count(db, user.id)
    return MarkReadResponse(unread_count=count)