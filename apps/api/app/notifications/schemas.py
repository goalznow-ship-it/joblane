"""
Pydantic schemas for the notifications API.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class NotificationOut(BaseModel):
    """Notification item."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    title: str
    message: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    is_read: bool = False


class NotificationListResponse(BaseModel):
    """Paginated notification list."""
    model_config = ConfigDict(from_attributes=True)

    items: list[NotificationOut]
    total: int
    unread_count: int
    page: int
    page_size: int


class UnreadCountResponse(BaseModel):
    """Unread notification count."""
    model_config = ConfigDict(from_attributes=True)

    unread_count: int = Field(..., ge=0)


class MarkReadResponse(BaseModel):
    """Response for marking notifications read."""
    model_config = ConfigDict(from_attributes=True)

    success: bool = True
    unread_count: int = Field(..., ge=0)