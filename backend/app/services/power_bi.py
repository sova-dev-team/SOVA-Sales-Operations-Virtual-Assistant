import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.core.config import Settings
from app.models import User


@dataclass(frozen=True)
class EmbedConfig:
    report_id: str
    embed_url: str
    access_token: str
    expires_at: datetime


class PowerBIAdapter(Protocol):
    async def create_embed_config(self, user: User) -> EmbedConfig: ...


class FakePowerBIAdapter:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def create_embed_config(self, user: User) -> EmbedConfig:
        if not self._settings.power_bi_report_id:
            raise LookupError("Power BI report is not configured.")
        expires_at = datetime.now(UTC) + timedelta(minutes=10)
        return EmbedConfig(
            report_id=self._settings.power_bi_report_id,
            embed_url="https://app.powerbi.com/reportEmbed?demo=true",
            access_token=f"demo-{user.id}-{secrets.token_urlsafe(24)}",
            expires_at=expires_at,
        )


async def list_reports(settings: Settings) -> list[dict[str, object]]:
    if not settings.power_bi_report_id:
        return []
    return [
        {
            "id": settings.power_bi_report_id,
            "name": "Sales & Operations Analytical Report",
            "description": "Synthetic-data analytical exploration for portfolio demo.",
            "embedUrl": "https://app.powerbi.com/reportEmbed?demo=true",
            "isAvailable": settings.power_bi_enabled,
        }
    ]
