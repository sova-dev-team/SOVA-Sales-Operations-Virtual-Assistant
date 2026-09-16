from datetime import datetime

from app.schemas.base import APIModel


class PowerBIReportResponse(APIModel):
    id: str
    name: str
    description: str
    embed_url: str
    is_available: bool


class PowerBIEmbedConfigResponse(APIModel):
    report_id: str
    embed_url: str
    access_token: str
    expires_at: datetime
    token_type: str = "EmbedToken"


class PowerBIRefreshStatusResponse(APIModel):
    status: str
    last_refreshed_at: datetime | None
    next_refresh_at: datetime | None
    message: str
