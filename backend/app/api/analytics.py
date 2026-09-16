from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.api.dependencies import DbSession, SettingsDependency, StaffOrAdminUser
from app.schemas.analytics import InteractionsTrendResponse, OverviewResponse, ProductCustomerCount
from app.schemas.customers import CustomerResponse, FollowUpResponse
from app.services.analytics import customers_by_product, interaction_trend, overview
from app.services.customers import list_follow_ups

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _range(start: datetime | None, end: datetime | None) -> tuple[datetime, datetime]:
    resolved_end = end or datetime.now(UTC)
    resolved_start = start or (resolved_end - timedelta(days=30))
    if resolved_start.tzinfo is None:
        resolved_start = resolved_start.replace(tzinfo=UTC)
    if resolved_end.tzinfo is None:
        resolved_end = resolved_end.replace(tzinfo=UTC)
    if resolved_start >= resolved_end:
        raise ValueError("Start date must be before end date.")
    return resolved_start.astimezone(UTC), resolved_end.astimezone(UTC)


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    current_user: StaffOrAdminUser,
    session: DbSession,
    settings: SettingsDependency,
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
) -> OverviewResponse:
    try:
        resolved_start, resolved_end = _range(start, end)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return await overview(session, current_user, settings, resolved_start, resolved_end)


@router.get("/customers-by-product", response_model=list[ProductCustomerCount])
async def get_customers_by_product(
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> list[ProductCustomerCount]:
    return await customers_by_product(session, current_user)


@router.get("/interactions-trend", response_model=InteractionsTrendResponse)
async def get_interactions_trend(
    current_user: StaffOrAdminUser,
    session: DbSession,
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
) -> InteractionsTrendResponse:
    try:
        resolved_start, resolved_end = _range(start, end)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return InteractionsTrendResponse(
        points=await interaction_trend(session, current_user, resolved_start, resolved_end)
    )


@router.get("/follow-ups", response_model=list[FollowUpResponse])
async def get_analytics_follow_ups(
    current_user: StaffOrAdminUser,
    session: DbSession,
    settings: SettingsDependency,
) -> list[FollowUpResponse]:
    return [
        FollowUpResponse(
            customer=CustomerResponse.model_validate(customer),
            last_interaction_at=latest,
            due_since=due_since,
        )
        for customer, latest, due_since in await list_follow_ups(
            session, current_user, settings.follow_up_interval_days
        )
    ]
