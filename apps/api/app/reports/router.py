"""
Public and admin report API endpoints.
"""
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, csrf_protection
from app.auth.models import User
from app.core.database import get_db
from app.admin.deps import require_permission
from app.admin.roles import Permission
from app.reports import service as report_service
from app.reports.service import ReportError
from app.admin.models import (
    ReportTargetType,
    ReportReason,
    ReportPriority,
    ReportResolution,
    BlocklistType,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
admin_router = APIRouter(prefix="/api/v1/admin/reports", tags=["admin-reports"])
blocklist_router = APIRouter(prefix="/api/v1/admin/blocklist", tags=["admin-blocklist"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ── Schemas ────────────────────────────────────────────────────────────

class ReportCreateRequest(BaseModel):
    target_type: ReportTargetType
    target_id: UUID
    reason: ReportReason
    description: Optional[str] = Field(None, max_length=2000)


class ReportListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminReportListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminAssignRequest(BaseModel):
    assignee_id: Optional[UUID] = None


class AdminPriorityRequest(BaseModel):
    priority: ReportPriority


class AdminDuplicateRequest(BaseModel):
    duplicate_of_report_id: UUID


class AdminDismissRequest(BaseModel):
    resolution_note: Optional[str] = None


class AdminResolveRequest(BaseModel):
    resolution: ReportResolution
    resolution_note: Optional[str] = None
    reporter_message: Optional[str] = None


class AdminJobActionRequest(BaseModel):
    action: str = Field(..., pattern="^(PAUSE|ARCHIVE|REJECT)$")
    reason: Optional[str] = None
    note: Optional[str] = None


class AdminCompanyActionRequest(BaseModel):
    action: str = Field(..., pattern="^(SUSPEND|REJECT)$")
    reason: Optional[str] = None
    note: Optional[str] = None


class BlocklistCreateRequest(BaseModel):
    type: BlocklistType
    value: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = None
    note: Optional[str] = None
    expires_at: Optional[str] = None


class BlocklistListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    limit: int
    total_pages: int


# ── Public (reporter) endpoints ────────────────────────────────────────


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ReportCreateRequest,
    request: Request,
    db: DbDep,
    user: Annotated[User, Depends(get_current_user)],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.create_report(
            db, user, body.target_type, body.target_id, body.reason, body.description, request
        )
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@router.get("/mine", response_model=ReportListResponse)
async def list_my_reports(
    db: DbDep,
    user: Annotated[User, Depends(get_current_user)],
    status: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    return await report_service.list_my_reports(db, user.id, status, target_type, page, limit)


@router.get("/{report_id}")
async def get_my_report(
    report_id: UUID,
    db: DbDep,
    user: Annotated[User, Depends(get_current_user)],
):
    try:
        return await report_service.get_my_report(db, user.id, report_id)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


# ── Admin report endpoints ─────────────────────────────────────────────


@admin_router.get("/", response_model=AdminReportListResponse)
async def admin_list_reports(
    db: DbDep,
    _actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    report_status: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    reason: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    from datetime import datetime as dt
    df = dt.fromisoformat(date_from) if date_from else None
    dt_to = dt.fromisoformat(date_to) if date_to else None
    return await report_service.admin_list_reports(
        db, report_status, priority, target_type, reason, assigned_to, df, dt_to, q, page, limit
    )


@admin_router.get("/{report_id}")
async def admin_get_report(
    report_id: UUID,
    db: DbDep,
    _actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
):
    try:
        return await report_service.admin_get_report(db, report_id)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/assign")
async def admin_assign_report(
    report_id: UUID,
    body: AdminAssignRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_assign_report(db, report_id, body.assignee_id, actor, request)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.patch("/{report_id}/priority")
async def admin_change_priority(
    report_id: UUID,
    body: AdminPriorityRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_change_priority(db, report_id, body.priority, actor, request)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/duplicate")
async def admin_mark_duplicate(
    report_id: UUID,
    body: AdminDuplicateRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_mark_duplicate(db, report_id, body.duplicate_of_report_id, actor, request)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/dismiss")
async def admin_dismiss_report(
    report_id: UUID,
    body: AdminDismissRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_dismiss_report(db, report_id, body.resolution_note, actor, request)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/confirm")
async def admin_confirm_violation(
    report_id: UUID,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_confirm_violation(db, report_id, actor, request)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/resolve")
async def admin_resolve_report(
    report_id: UUID,
    body: AdminResolveRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_resolve_report(
            db, report_id, body.resolution, body.resolution_note, body.reporter_message, actor, request
        )
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/actions/job")
async def admin_job_action_from_report(
    report_id: UUID,
    body: AdminJobActionRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.admin_job_action_from_report(
            db, report_id, body.action, body.reason, body.note, actor, request
        )
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.post("/{report_id}/actions/company")
async def admin_company_action_from_report(
    report_id: UUID,
    body: AdminCompanyActionRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
):
    try:
        return await report_service.admin_company_action_from_report(
            db, report_id, body.action, body.reason, body.note, actor, request
        )
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@admin_router.get("/{report_id}/risk-signals")
async def get_report_risk_signals(
    report_id: UUID,
    db: DbDep,
    _actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
):
    from sqlalchemy import select
    from app.admin.models import Report

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Hesabat tapılmadı")
    return await report_service.get_report_risk_signals(db, report.target_type, report.target_id)


# ── Blocklist endpoints ────────────────────────────────────────────────


@blocklist_router.get("/", response_model=BlocklistListResponse)
async def list_blocklist(
    db: DbDep,
    _actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    block_type: Optional[str] = Query(None, alias="type"),
    block_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await report_service.list_blocklist(db, block_type, block_status, page, limit)


@blocklist_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_blocklist_entry(
    body: BlocklistCreateRequest,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    from datetime import datetime as dt
    expires_at = dt.fromisoformat(body.expires_at) if body.expires_at else None
    try:
        return await report_service.create_blocklist_entry(
            db, body.type, body.value, body.reason, body.note, expires_at, actor, request
        )
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)


@blocklist_router.patch("/{entry_id}")
async def update_blocklist_entry(
    entry_id: UUID,
    request: Request,
    db: DbDep,
    _actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    from fastapi import HTTPException
    raise HTTPException(status_code=501, detail="Yeniləmə funksiyası hələ tətbiq edilməyib")


@blocklist_router.delete("/{entry_id}")
async def deactivate_blocklist_entry(
    entry_id: UUID,
    request: Request,
    db: DbDep,
    actor: Annotated[User, Depends(require_permission(Permission.REPORTS_MANAGE))],
    _: bool = Depends(csrf_protection),
):
    try:
        return await report_service.deactivate_blocklist_entry(db, entry_id, actor, request)
    except ReportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.code, detail=e.detail)
