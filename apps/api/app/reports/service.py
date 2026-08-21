"""
Report and moderation business logic.
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.audit import record_audit
from app.admin.models import (
    AuditLog,
    Company,
    Job,
    Report,
    ReportHistory,
    ReportTargetType,
    ReportReason,
    ReportStatus,
    ReportPriority,
    ReportResolution,
    ModerationBlocklist,
    BlocklistType,
    BlocklistStatus,
)
from app.auth.models import User
from app.notifications.models import NotificationType
from app.notifications.service import create_notification

logger = logging.getLogger(__name__)

MAX_DESCRIPTION_LENGTH = 2000

REPORT_REASON_LABELS = {
    ReportReason.SPAM: "Spam",
    ReportReason.SCAM: "Dələduzluq şübhəsi",
    ReportReason.FRAUD: "Dələduzluq",
    ReportReason.MISLEADING_INFORMATION: "Yanlış/misleading məlumat",
    ReportReason.DISCRIMINATORY_CONTENT: "Diskriminativ məzmun",
    ReportReason.INAPPROPRIATE_CONTENT: "Uyğunsuz məzmun",
    ReportReason.DUPLICATE_LISTING: "Təkrar elan",
    ReportReason.EXPIRED_OR_INVALID: "Elan etibarsızdır",
    ReportReason.FAKE_COMPANY: "Sahte şirkət",
    ReportReason.SUSPICIOUS_CONTACT: "Şübhəli əlaqə məlumatı",
    ReportReason.OTHER: "Digər",
}


class ReportError(Exception):
    def __init__(self, detail: str, code: int = 400):
        self.detail = detail
        self.code = code
        super().__init__(detail)


# ── Helpers ────────────────────────────────────────────────────────────


def hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


def _build_job_snapshot(job: Job) -> dict:
    return {
        "id": str(job.id),
        "title": job.title,
        "slug": job.slug,
        "company_id": str(job.company_id),
        "company_name": job.company.name if job.company else None,
        "status": job.status.value if job.status else None,
        "public_url": f"/jobs/{job.slug}" if job.slug else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


def _build_company_snapshot(company: Company) -> dict:
    return {
        "id": str(company.id),
        "name": company.name,
        "slug": company.slug,
        "status": company.status.value if company.status else None,
        "is_verified": company.status.value in ("VERIFIED", "ACTIVE") if company.status else False,
    }


async def _add_report_history(
    db: AsyncSession,
    report: Report,
    actor_id: Optional[UUID],
    action: str,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    note: Optional[str] = None,
) -> ReportHistory:
    entry = ReportHistory(
        report_id=report.id,
        actor_id=actor_id,
        from_status=from_status,
        to_status=to_status,
        action=action,
        note=note,
    )
    db.add(entry)
    return entry


async def _is_rate_limited(db: AsyncSession, user_id: Optional[UUID], ip_hash: Optional[str]) -> bool:
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    if user_id:
        result = await db.execute(
            select(func.count(Report.id)).where(
                Report.reporter_id == user_id,
                Report.created_at >= one_hour_ago,
            )
        )
        if (result.scalar() or 0) >= 10:
            return True
    if ip_hash:
        result = await db.execute(
            select(func.count(Report.id)).where(
                Report.reporter_ip_hash == ip_hash,
                Report.created_at >= one_hour_ago,
            )
        )
        if (result.scalar() or 0) >= 20:
            return True
    return False


async def _is_duplicate_report(
    db: AsyncSession,
    reporter_id: UUID,
    target_type: ReportTargetType,
    target_id: UUID,
    reason: ReportReason,
) -> bool:
    result = await db.execute(
        select(Report.id).where(
            Report.reporter_id == reporter_id,
            Report.target_type == target_type,
            Report.target_id == target_id,
            Report.reason == reason,
            Report.status.in_([ReportStatus.OPEN, ReportStatus.UNDER_REVIEW]),
        )
    )
    return result.scalar_one_or_none() is not None


def _safe_report_for_reporter(report: Report) -> dict:
    return {
        "id": str(report.id),
        "target_type": report.target_type.value,
        "target_id": str(report.target_id),
        "reason": report.reason.value,
        "reason_label": REPORT_REASON_LABELS.get(report.reason, report.reason.value),
        "description": report.description,
        "status": report.status.value,
        "target_snapshot": report.target_snapshot,
        "resolution": report.resolution.value if report.resolution else None,
        "reporter_message": report.reporter_message,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }


def _safe_report_for_admin(report: Report) -> dict:
    return {
        "id": str(report.id),
        "reporter_id": str(report.reporter_id),
        "target_type": report.target_type.value,
        "target_id": str(report.target_id),
        "reason": report.reason.value,
        "reason_label": REPORT_REASON_LABELS.get(report.reason, report.reason.value),
        "description": report.description,
        "status": report.status.value,
        "priority": report.priority.value,
        "target_snapshot": report.target_snapshot,
        "assigned_to": str(report.assigned_to) if report.assigned_to else None,
        "resolved_by": str(report.resolved_by) if report.resolved_by else None,
        "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
        "resolution": report.resolution.value if report.resolution else None,
        "resolution_note": report.resolution_note,
        "reporter_message": report.reporter_message,
        "duplicate_of": str(report.duplicate_of) if report.duplicate_of else None,
        "source": report.source,
        "reporter_ip_hash": report.reporter_ip_hash,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }


async def _get_target_current_state(db: AsyncSession, target_type: ReportTargetType, target_id: UUID) -> Optional[dict]:
    if target_type == ReportTargetType.JOB:
        result = await db.execute(
            select(Job).options(selectinload(Job.company)).where(Job.id == target_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            return None
        return {
            "status": job.status.value if job.status else None,
            "title": job.title,
            "company_name": job.company.name if job.company else None,
        }
    elif target_type == ReportTargetType.COMPANY:
        result = await db.execute(select(Company).where(Company.id == target_id))
        company = result.scalar_one_or_none()
        if not company:
            return None
        return {
            "status": company.status.value if company.status else None,
            "name": company.name,
        }
    return None


# ── Public (reporter) functions ────────────────────────────────────────


async def create_report(
    db: AsyncSession,
    reporter: User,
    target_type: ReportTargetType,
    target_id: UUID,
    reason: ReportReason,
    description: Optional[str],
    request: Request,
) -> dict:
    description = (description or "").strip()[:MAX_DESCRIPTION_LENGTH]

    if target_type == ReportTargetType.JOB:
        result = await db.execute(
            select(Job).options(selectinload(Job.company)).where(Job.id == target_id)
        )
        target = result.scalar_one_or_none()
        if not target:
            raise ReportError("Vakansiya tapılmadı", 404)
        snapshot = _build_job_snapshot(target)
    elif target_type == ReportTargetType.COMPANY:
        result = await db.execute(select(Company).where(Company.id == target_id))
        target = result.scalar_one_or_none()
        if not target:
            raise ReportError("Şirkət tapılmadı", 404)
        snapshot = _build_company_snapshot(target)
    else:
        raise ReportError("Yanlış hədəf növü")

    ip = request.client.host if request else None
    ip_hash = hash_ip(ip) if ip else None

    if await _is_rate_limited(db, reporter.id, ip_hash):
        raise ReportError("Həddindən artıq çox hesabat göndərdiniz. Bir az gözləyin.")

    if await _is_duplicate_report(db, reporter.id, target_type, target_id, reason):
        raise ReportError("Bu hədəf üçün artıq oxşar hesabatınız var.")

    report = Report(
        reporter_id=reporter.id,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        description=description,
        status=ReportStatus.OPEN,
        priority=ReportPriority.NORMAL,
        target_snapshot=snapshot,
        source="web",
        reporter_ip_hash=ip_hash,
    )
    db.add(report)
    await db.flush()

    await _add_report_history(db, report, reporter.id, "CREATED")
    await record_audit(
        db,
        actor=reporter,
        action="report.created",
        entity_type="report",
        entity_id=report.id,
        after={"target_type": target_type.value, "target_id": str(target_id), "reason": reason.value},
        request=request,
    )

    await create_notification(
        db,
        user_id=reporter.id,
        type=NotificationType.REPORT_RECEIVED,
        title="Hesabat qəbul edildi",
        message=f"Hesabatınız qəbul edildi və nəzərdən keçiriləcək. Nömrəsi: #{str(report.id)[:8]}",
        entity_type="report",
        entity_id=report.id,
    )

    return {"id": str(report.id), "status": report.status.value}


async def list_my_reports(
    db: AsyncSession,
    user_id: UUID,
    status_filter: Optional[str] = None,
    target_type_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    page = max(1, page)
    limit = min(max(1, limit), 50)

    conditions = [Report.reporter_id == user_id]
    if status_filter:
        try:
            conditions.append(Report.status == ReportStatus(status_filter))
        except ValueError:
            pass
    if target_type_filter:
        try:
            conditions.append(Report.target_type == ReportTargetType(target_type_filter))
        except ValueError:
            pass

    base = select(Report).where(and_(*conditions))

    total = (await db.execute(select(func.count()).select_from(base.order_by(None).subquery()))).scalar() or 0

    result = await db.execute(
        base.order_by(Report.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    reports = result.scalars().all()

    return {
        "items": [_safe_report_for_reporter(r) for r in reports],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


async def get_my_report(db: AsyncSession, user_id: UUID, report_id: UUID) -> dict:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.reporter_id == user_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)
    return _safe_report_for_reporter(report)


# ── Admin functions ────────────────────────────────────────────────────


async def admin_list_reports(
    db: AsyncSession,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    target_type: Optional[str] = None,
    reason: Optional[str] = None,
    assigned_to: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    page = max(1, page)
    limit = min(max(1, limit), 100)
    conditions = []

    if status:
        try:
            conditions.append(Report.status == ReportStatus(status))
        except ValueError:
            pass
    if priority:
        try:
            conditions.append(Report.priority == ReportPriority(priority))
        except ValueError:
            pass
    if target_type:
        try:
            conditions.append(Report.target_type == ReportTargetType(target_type))
        except ValueError:
            pass
    if reason:
        try:
            conditions.append(Report.reason == ReportReason(reason))
        except ValueError:
            pass
    if assigned_to:
        conditions.append(Report.assigned_to == assigned_to)
    if date_from:
        conditions.append(Report.created_at >= date_from)
    if date_to:
        conditions.append(Report.created_at <= date_to)
    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(Report.description.ilike(pattern))

    base = select(Report)
    if conditions:
        base = base.where(and_(*conditions))

    total = (await db.execute(select(func.count()).select_from(base.order_by(None).subquery()))).scalar() or 0

    result = await db.execute(
        base.order_by(Report.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    reports = result.scalars().all()

    return {
        "items": [_safe_report_for_admin(r) for r in reports],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


async def admin_get_report(db: AsyncSession, report_id: UUID) -> dict:
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    history_result = await db.execute(
        select(ReportHistory).where(ReportHistory.report_id == report_id).order_by(ReportHistory.created_at.asc())
    )
    history = history_result.scalars().all()

    related_result = await db.execute(
        select(Report).where(
            Report.target_type == report.target_type,
            Report.target_id == report.target_id,
            Report.id != report.id,
        ).order_by(Report.created_at.desc()).limit(10)
    )
    related = related_result.scalars().all()

    target_state = await _get_target_current_state(db, report.target_type, report.target_id)

    data = _safe_report_for_admin(report)
    data["history"] = [
        {
            "id": str(h.id),
            "actor_id": str(h.actor_id) if h.actor_id else None,
            "from_status": h.from_status,
            "to_status": h.to_status,
            "action": h.action,
            "note": h.note,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in history
    ]
    data["related_reports"] = [_safe_report_for_admin(r) for r in related]
    data["target_current_state"] = target_state
    return data


async def admin_assign_report(db: AsyncSession, report_id: UUID, assignee_id: Optional[UUID], actor: User, request: Request) -> dict:
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    target_assignee = assignee_id or actor.id
    old_status = report.status.value
    if report.status == ReportStatus.OPEN:
        report.status = ReportStatus.UNDER_REVIEW
    report.assigned_to = target_assignee

    await _add_report_history(
        db, report, actor.id, "ASSIGNED",
        from_status=old_status, to_status=report.status.value,
        note=f"Təyin edildi: {target_assignee}",
    )
    await record_audit(
        db, actor=actor, action="report.assigned", entity_type="report", entity_id=report.id,
        before={"assigned_to": str(report.assigned_to) if report.assigned_to else None},
        after={"assigned_to": str(target_assignee), "status": report.status.value},
        request=request,
    )
    return {"id": str(report.id), "status": report.status.value, "assigned_to": str(target_assignee)}


async def admin_change_priority(db: AsyncSession, report_id: UUID, priority: ReportPriority, actor: User, request: Request) -> dict:
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    old_priority = report.priority.value
    report.priority = priority

    await _add_report_history(db, report, actor.id, "PRIORITY_CHANGED", note=f"Prioritet: {old_priority} → {priority.value}")
    await record_audit(
        db, actor=actor, action="report.priority_changed", entity_type="report", entity_id=report.id,
        before={"priority": old_priority}, after={"priority": priority.value},
        request=request,
    )
    return {"id": str(report.id), "priority": priority.value}


async def admin_mark_duplicate(db: AsyncSession, report_id: UUID, duplicate_of_id: UUID, actor: User, request: Request) -> dict:
    if report_id == duplicate_of_id:
        raise ReportError("Hesabat özünə təkrar ola bilməz")

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    dup_result = await db.execute(select(Report).where(Report.id == duplicate_of_id))
    dup_report = dup_result.scalar_one_or_none()
    if not dup_report:
        raise ReportError("Təkrar hesabat tapılmadı", 404)

    old_status = report.status.value
    report.status = ReportStatus.DUPLICATE
    report.duplicate_of = duplicate_of_id

    await _add_report_history(
        db, report, actor.id, "MARKED_DUPLICATE",
        from_status=old_status, to_status=ReportStatus.DUPLICATE.value,
        note=f"Duplicate of {duplicate_of_id}",
    )
    await record_audit(
        db, actor=actor, action="report.marked_duplicate", entity_type="report", entity_id=report.id,
        before={"status": old_status}, after={"status": ReportStatus.DUPLICATE.value, "duplicate_of": str(duplicate_of_id)},
        request=request,
    )
    return {"id": str(report.id), "status": report.status.value, "duplicate_of": str(duplicate_of_id)}


async def admin_dismiss_report(db: AsyncSession, report_id: UUID, resolution_note: Optional[str], actor: User, request: Request) -> dict:
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    old_status = report.status.value
    report.status = ReportStatus.DISMISSED
    report.resolution_note = resolution_note
    report.resolved_by = actor.id
    report.resolved_at = datetime.now(timezone.utc)

    await _add_report_history(
        db, report, actor.id, "DISMISSED",
        from_status=old_status, to_status=ReportStatus.DISMISSED.value,
        note=resolution_note,
    )
    await record_audit(
        db, actor=actor, action="report.dismissed", entity_type="report", entity_id=report.id,
        before={"status": old_status}, after={"status": ReportStatus.DISMISSED.value},
        request=request,
    )
    await create_notification(
        db,
        user_id=report.reporter_id,
        type=NotificationType.REPORT_RESOLVED,
        title="Hesabat rədd edildi",
        message=f"Hesabatınız nəzərdən keçirildi və pozuntu aşkar edilmədi. #{str(report.id)[:8]}",
        entity_type="report",
        entity_id=report.id,
    )
    return {"id": str(report.id), "status": report.status.value}


async def admin_confirm_violation(db: AsyncSession, report_id: UUID, actor: User, request: Request) -> dict:
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    if report.status in (ReportStatus.RESOLVED, ReportStatus.DISMISSED, ReportStatus.DUPLICATE):
        raise ReportError("Hesabat artıq bağlanıb", 400)

    old_status = report.status.value
    report.status = ReportStatus.ACTION_REQUIRED

    await _add_report_history(
        db, report, actor.id, "VIOLATION_CONFIRMED",
        from_status=old_status, to_status=ReportStatus.ACTION_REQUIRED.value,
    )
    await record_audit(
        db, actor=actor, action="report.violation_confirmed", entity_type="report", entity_id=report.id,
        before={"status": old_status}, after={"status": ReportStatus.ACTION_REQUIRED.value},
        request=request,
    )
    return {"id": str(report.id), "status": report.status.value}


async def admin_resolve_report(
    db: AsyncSession,
    report_id: UUID,
    resolution: ReportResolution,
    resolution_note: Optional[str],
    reporter_message: Optional[str],
    actor: User,
    request: Request,
) -> dict:
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)

    old_status = report.status.value
    report.status = ReportStatus.RESOLVED
    report.resolution = resolution
    report.resolution_note = resolution_note
    report.reporter_message = reporter_message
    report.resolved_by = actor.id
    report.resolved_at = datetime.now(timezone.utc)

    await _add_report_history(
        db, report, actor.id, "RESOLVED",
        from_status=old_status, to_status=ReportStatus.RESOLVED.value,
        note=f"Resolution: {resolution.value}",
    )
    await record_audit(
        db, actor=actor, action="report.resolved", entity_type="report", entity_id=report.id,
        before={"status": old_status, "resolution": None},
        after={"status": ReportStatus.RESOLVED.value, "resolution": resolution.value},
        request=request,
    )
    await create_notification(
        db,
        user_id=report.reporter_id,
        type=NotificationType.REPORT_RESOLVED,
        title="Hesabat həll edildi",
        message=reporter_message or f"Hesabatınız həll edildi. #{str(report.id)[:8]}",
        entity_type="report",
        entity_id=report.id,
    )
    return {"id": str(report.id), "status": report.status.value, "resolution": resolution.value}


async def admin_job_action_from_report(
    db: AsyncSession,
    report_id: UUID,
    action: str,
    reason: Optional[str],
    note: Optional[str],
    actor: User,
    request: Request,
) -> dict:
    from app.admin.service import change_job_status, moderate_job, get_job_or_404

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)
    if report.target_type != ReportTargetType.JOB:
        raise ReportError("Bu hesabat vakansiyaya aid deyil")

    job = await get_job_or_404(db, report.target_id)

    upper_action = action.upper()
    if upper_action == "REJECT":
        await moderate_job(db, job, actor, "reject", reason=reason, note=note)
    elif upper_action in ("PAUSE", "ARCHIVE"):
        action_map = {"PAUSE": "pause", "ARCHIVE": "archive"}
        await change_job_status(db, job, actor, action_map[upper_action], note=reason or note)
    else:
        raise ReportError(f"Yanlış əməliyyat: {action}")

    resolution = ReportResolution.CONTENT_REMOVED if upper_action in ("REJECT", "ARCHIVE") else ReportResolution.CONTENT_PAUSED
    old_status = report.status.value
    report.status = ReportStatus.RESOLVED
    report.resolution = resolution
    report.resolution_note = f"İş əməliyyatı: {action}. {reason or ''}"
    report.resolved_by = actor.id
    report.resolved_at = datetime.now(timezone.utc)

    await _add_report_history(
        db, report, actor.id, "JOB_ACTION",
        from_status=old_status, to_status=ReportStatus.RESOLVED.value,
        note=f"Job {action}: {reason or note or ''}",
    )
    await record_audit(
        db, actor=actor, action="report.job_action", entity_type="report", entity_id=report.id,
        after={"job_action": action, "resolution": report.resolution.value},
        request=request,
    )
    return {"id": str(report.id), "status": report.status.value, "resolution": report.resolution.value}


async def admin_company_action_from_report(
    db: AsyncSession,
    report_id: UUID,
    action: str,
    reason: Optional[str],
    note: Optional[str],
    actor: User,
    request: Request,
) -> dict:
    from app.admin.service import change_company_status, get_company_or_404

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise ReportError("Hesabat tapılmadı", 404)
    if report.target_type != ReportTargetType.COMPANY:
        raise ReportError("Bu hesabat şirkətə aid deyil")

    company = await get_company_or_404(db, report.target_id)

    action_map = {"SUSPEND": "suspend", "REJECT": "reject"}
    internal_action = action_map.get(action.upper())
    if not internal_action:
        raise ReportError(f"Yanlış əməliyyat: {action}")

    await change_company_status(db, company, actor, internal_action, reason=reason, note=note)

    old_status = report.status.value
    report.status = ReportStatus.RESOLVED
    report.resolution = ReportResolution.COMPANY_ACTION_TAKEN
    report.resolution_note = f"Şirkət əməliyyatı: {action}. {reason or ''}"
    report.resolved_by = actor.id
    report.resolved_at = datetime.now(timezone.utc)

    await _add_report_history(
        db, report, actor.id, "COMPANY_ACTION",
        from_status=old_status, to_status=ReportStatus.RESOLVED.value,
        note=f"Company {action}: {reason or note or ''}",
    )
    await record_audit(
        db, actor=actor, action="report.company_action", entity_type="report", entity_id=report.id,
        after={"company_action": action, "resolution": report.resolution.value},
        request=request,
    )
    return {"id": str(report.id), "status": report.status.value, "resolution": report.resolution.value}


# ── Risk signals ───────────────────────────────────────────────────────


async def get_report_risk_signals(db: AsyncSession, target_type: ReportTargetType, target_id: UUID) -> dict:
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    count_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.target_type == target_type,
            Report.target_id == target_id,
            Report.created_at >= seven_days_ago,
        )
    )
    report_count_7d = count_result.scalar() or 0

    unique_result = await db.execute(
        select(func.count(func.distinct(Report.reporter_id))).where(
            Report.target_type == target_type,
            Report.target_id == target_id,
            Report.created_at >= seven_days_ago,
        )
    )
    unique_reporters_7d = unique_result.scalar() or 0

    fraud_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.target_type == target_type,
            Report.target_id == target_id,
            Report.reason.in_([ReportReason.FRAUD, ReportReason.SCAM]),
            Report.created_at >= seven_days_ago,
        )
    )
    fraud_reason_count = fraud_result.scalar() or 0

    spam_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.target_type == target_type,
            Report.target_id == target_id,
            Report.reason == ReportReason.SPAM,
            Report.created_at >= seven_days_ago,
        )
    )
    spam_reason_count = spam_result.scalar() or 0

    if fraud_reason_count >= 3 or unique_reporters_7d >= 5:
        risk_label = "HIGH"
    elif report_count_7d >= 3 or fraud_reason_count >= 1:
        risk_label = "MEDIUM"
    else:
        risk_label = "LOW"

    return {
        "report_count_7d": report_count_7d,
        "unique_reporters_7d": unique_reporters_7d,
        "fraud_reason_count": fraud_reason_count,
        "spam_reason_count": spam_reason_count,
        "risk_label": risk_label,
    }


# ── Blocklist ──────────────────────────────────────────────────────────


async def create_blocklist_entry(
    db: AsyncSession,
    entry_type: BlocklistType,
    value: str,
    reason: Optional[str],
    note: Optional[str],
    expires_at: Optional[datetime],
    actor: User,
    request: Request,
) -> dict:
    if entry_type == BlocklistType.EMAIL:
        value_normalized = value.strip().lower()
    elif entry_type == BlocklistType.EMAIL_DOMAIN:
        value_normalized = value.strip().lower().lstrip("@")
    else:
        raise ReportError("Yanlış blok növü")

    existing = await db.execute(
        select(ModerationBlocklist).where(
            ModerationBlocklist.type == entry_type,
            ModerationBlocklist.value_normalized == value_normalized,
            ModerationBlocklist.status == BlocklistStatus.ACTIVE,
        )
    )
    if existing.scalar_one_or_none():
        raise ReportError("Bu dəyər artıq blok siyahısındadır")

    entry = ModerationBlocklist(
        type=entry_type,
        value_normalized=value_normalized,
        reason=reason,
        note=note,
        status=BlocklistStatus.ACTIVE,
        created_by=actor.id,
        expires_at=expires_at,
    )
    db.add(entry)
    await db.flush()

    await record_audit(
        db, actor=actor, action="blocklist.created", entity_type="blocklist", entity_id=entry.id,
        after={"type": entry_type.value, "value": value_normalized},
        request=request,
    )
    return {"id": str(entry.id), "type": entry_type.value, "value": value_normalized, "status": entry.status.value}


async def list_blocklist(
    db: AsyncSession,
    entry_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    page = max(1, page)
    limit = min(max(1, limit), 100)
    conditions = []

    if entry_type:
        try:
            conditions.append(ModerationBlocklist.type == BlocklistType(entry_type))
        except ValueError:
            pass
    if status_filter:
        try:
            conditions.append(ModerationBlocklist.status == BlocklistStatus(status_filter))
        except ValueError:
            pass

    base = select(ModerationBlocklist)
    if conditions:
        base = base.where(and_(*conditions))

    total = (await db.execute(select(func.count()).select_from(base.order_by(None).subquery()))).scalar() or 0

    result = await db.execute(
        base.order_by(ModerationBlocklist.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    entries = result.scalars().all()

    return {
        "items": [
            {
                "id": str(e.id),
                "type": e.type.value,
                "value": e.value_normalized,
                "reason": e.reason,
                "note": e.note,
                "status": e.status.value,
                "created_by": str(e.created_by),
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "expires_at": e.expires_at.isoformat() if e.expires_at else None,
            }
            for e in entries
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


async def deactivate_blocklist_entry(db: AsyncSession, entry_id: UUID, actor: User, request: Request) -> dict:
    result = await db.execute(select(ModerationBlocklist).where(ModerationBlocklist.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise ReportError("Blok girişi tapılmadı", 404)

    entry.status = BlocklistStatus.INACTIVE

    await record_audit(
        db, actor=actor, action="blocklist.deactivated", entity_type="blocklist", entity_id=entry.id,
        after={"status": BlocklistStatus.INACTIVE.value},
        request=request,
    )
    return {"id": str(entry.id), "status": entry.status.value}


async def check_blocklist(email: str, db: AsyncSession) -> Optional[str]:
    email_normalized = email.strip().lower()
    domain = email_normalized.split("@")[-1] if "@" in email_normalized else None

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ModerationBlocklist).where(
            ModerationBlocklist.type == BlocklistType.EMAIL,
            ModerationBlocklist.value_normalized == email_normalized,
            ModerationBlocklist.status == BlocklistStatus.ACTIVE,
            or_(ModerationBlocklist.expires_at.is_(None), ModerationBlocklist.expires_at > now),
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        return entry.reason or "Email blocked"

    if domain:
        result = await db.execute(
            select(ModerationBlocklist).where(
                ModerationBlocklist.type == BlocklistType.EMAIL_DOMAIN,
                ModerationBlocklist.value_normalized == domain,
                ModerationBlocklist.status == BlocklistStatus.ACTIVE,
                or_(ModerationBlocklist.expires_at.is_(None), ModerationBlocklist.expires_at > now),
            )
        )
        entry = result.scalar_one_or_none()
        if entry:
            return entry.reason or "Email domain blocked"

    return None
