from collections.abc import Mapping
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog

_SENSITIVE_MARKERS = ("password", "token", "secret", "prompt", "body")


def redact_metadata(metadata: Mapping[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, value in metadata.items():
        if any(marker in key.lower() for marker in _SENSITIVE_MARKERS):
            redacted[key] = "[REDACTED]"
        elif isinstance(value, Mapping):
            redacted[key] = redact_metadata(value)
        else:
            redacted[key] = value
    return redacted


async def record_audit(
    session: AsyncSession,
    *,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None,
    metadata: Mapping[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=redact_metadata(metadata or {}),
    )
    session.add(entry)
    await session.flush()
    return entry
