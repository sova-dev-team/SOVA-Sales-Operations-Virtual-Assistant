from datetime import datetime
from typing import Any
from uuid import UUID

from app.schemas.base import APIModel
from app.schemas.common import PageMeta


class AuditLogResponse(APIModel):
    id: UUID
    actor_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID | None
    metadata_json: dict[str, Any]
    created_at: datetime


class AuditLogPageResponse(APIModel):
    items: list[AuditLogResponse]
    meta: PageMeta
