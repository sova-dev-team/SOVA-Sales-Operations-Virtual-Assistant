from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import DbSession, SettingsDependency, StaffOrAdminUser
from app.schemas.power_bi import (
    PowerBIEmbedConfigResponse,
    PowerBIRefreshStatusResponse,
    PowerBIReportResponse,
)
from app.services.audit import record_audit
from app.services.power_bi import FakePowerBIAdapter, list_reports

router = APIRouter(prefix="/api/v1/power-bi", tags=["power-bi"])


@router.get("/reports", response_model=list[PowerBIReportResponse])
async def get_power_bi_reports(
    _user: StaffOrAdminUser,
    settings: SettingsDependency,
) -> list[PowerBIReportResponse]:
    return [PowerBIReportResponse.model_validate(item) for item in await list_reports(settings)]


@router.post("/embed-config", response_model=PowerBIEmbedConfigResponse)
async def post_power_bi_embed_config(
    current_user: StaffOrAdminUser,
    session: DbSession,
    settings: SettingsDependency,
) -> PowerBIEmbedConfigResponse:
    if not settings.power_bi_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Power BI embedding is not enabled.",
        )
    try:
        config = await FakePowerBIAdapter(settings).create_embed_config(current_user)
    except LookupError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    await record_audit(
        session,
        actor_id=current_user.id,
        action="power_bi.embed_config_created",
        entity_type="power_bi_report",
        entity_id=None,
        metadata={"reportId": config.report_id},
    )
    await session.commit()
    return PowerBIEmbedConfigResponse(
        report_id=config.report_id,
        embed_url=config.embed_url,
        access_token=config.access_token,
        expires_at=config.expires_at,
    )


@router.get("/refresh-status", response_model=PowerBIRefreshStatusResponse)
async def get_power_bi_refresh_status(
    _user: StaffOrAdminUser,
    settings: SettingsDependency,
) -> PowerBIRefreshStatusResponse:
    if not settings.power_bi_enabled:
        return PowerBIRefreshStatusResponse(
            status="unavailable",
            last_refreshed_at=None,
            next_refresh_at=None,
            message="Power BI embedding is not enabled.",
        )
    now = datetime.now(UTC)
    return PowerBIRefreshStatusResponse(
        status="ready",
        last_refreshed_at=now,
        next_refresh_at=now + timedelta(hours=1),
        message="Demo report is using synthetic data.",
    )
