from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.dependencies import AdminUser, DbSession
from app.models import AuditLog
from app.schemas.audit import AuditLogPageResponse, AuditLogResponse
from app.schemas.common import PageMeta

router = APIRouter(prefix="/api/v1/audit-logs", tags=["audit"])


@router.get("", response_model=AuditLogPageResponse)
async def get_audit_logs(
    _admin: AdminUser,
    session: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    action: str | None = Query(default=None, max_length=100),
    entity_type: str | None = Query(default=None, alias="entityType", max_length=80),
    entity_id: UUID | None = Query(default=None, alias="entityId"),
) -> AuditLogPageResponse:
    filters = []
    if action:
        filters.append(AuditLog.action == action)
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if entity_id:
        filters.append(AuditLog.entity_id == entity_id)
    total = int(
        await session.scalar(select(func.count()).select_from(AuditLog).where(*filters)) or 0
    )
    logs = list(
        (
            await session.scalars(
                select(AuditLog)
                .where(*filters)
                .order_by(AuditLog.created_at.desc(), AuditLog.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
    )
    return AuditLogPageResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        meta=PageMeta.from_total(page=page, page_size=page_size, total=total),
    )
