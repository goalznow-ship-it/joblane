"""
FastAPI dependencies for admin authorization.

Enforces server-side RBAC using the session-authenticated user's role.
"""

from typing import Annotated
from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.admin.roles import has_permission, is_admin_role


class AdminPermissionDenied(HTTPException):
    def __init__(self, detail: str = "Bu əməliyyat üçün icazəniz yoxdur"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def require_permission(permission: str):
    """
    Dependency factory: require the current user to be an admin with
    the given permission. Works per-route and per-module.
    """

    async def dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.status.value != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hesab aktiv deyil",
            )
        if not is_admin_role(user.role):
            raise AdminPermissionDenied("Admin icazəsi tələb olunur")
        if not has_permission(user.role, permission):
            raise AdminPermissionDenied()
        return user

    return dependency


# Convenience dependencies used by routers
require_admin = require_permission
