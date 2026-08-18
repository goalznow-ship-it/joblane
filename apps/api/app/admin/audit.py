"""
Audit logging for admin actions.

Every important admin mutation records an AuditLog row (read-only for
normal admins). The entry is added to the same session as the mutation
so it commits atomically.
"""

import json
from typing import Any, Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import AuditLog
from app.auth.models import User


def _jsonable(value: Any) -> Any:
    if value is None:
        return None
    try:
        return json.loads(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return str(value)


async def record_audit(
    db: AsyncSession,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: Any = None,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """Record an audit entry in the current transaction."""
    entry = AuditLog(
        actor_id=actor.id,
        actor_email=actor.email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        before=_jsonable(before),
        after=_jsonable(after),
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("User-Agent") if request else None,
    )
    db.add(entry)
    return entry
