from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import DbSession, SettingsDependency, StaffOrAdminUser
from app.models import Customer
from app.models.entities import CustomerStatus
from app.schemas.common import PageMeta, PageResponse
from app.schemas.customers import (
    CustomerCreateRequest,
    CustomerResponse,
    CustomerUpdateRequest,
    FollowUpResponse,
    InteractionCreateRequest,
    InteractionResponse,
)
from app.services.customers import (
    add_interaction,
    archive_customer,
    create_customer,
    get_customer,
    list_customers,
    list_follow_ups,
    list_interactions,
    update_customer,
)

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


@router.get("", response_model=PageResponse[CustomerResponse])
async def get_customers(
    current_user: StaffOrAdminUser,
    session: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    status_filter: CustomerStatus | None = Query(default=None, alias="status"),
    owner_id: UUID | None = None,
    sort_by: str = Query(default="updatedAt", alias="sortBy"),
) -> PageResponse[CustomerResponse]:
    customers, total = await list_customers(
        session,
        current_user,
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
        owner_id=owner_id,
        sort_by=sort_by,
    )
    return PageResponse(
        items=[CustomerResponse.model_validate(customer) for customer in customers],
        meta=PageMeta.from_total(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def post_customer(
    payload: CustomerCreateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> Customer:
    try:
        customer = await create_customer(session, current_user, payload)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await session.commit()
    await session.refresh(customer)
    return customer


@router.get("/follow-ups", response_model=list[FollowUpResponse])
async def get_follow_ups(
    current_user: StaffOrAdminUser,
    session: DbSession,
    settings: SettingsDependency,
) -> list[FollowUpResponse]:
    follow_ups = await list_follow_ups(session, current_user, settings.follow_up_interval_days)
    return [
        FollowUpResponse(
            customer=CustomerResponse.model_validate(customer),
            last_interaction_at=latest,
            due_since=due_since,
        )
        for customer, latest, due_since in follow_ups
    ]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer_by_id(
    customer_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> Customer:
    customer = await get_customer(session, current_user, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def patch_customer(
    customer_id: UUID,
    payload: CustomerUpdateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> Customer:
    try:
        customer = await update_customer(session, current_user, customer_id, payload)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await session.commit()
    await session.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> None:
    try:
        await archive_customer(session, current_user, customer_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await session.commit()


@router.get("/{customer_id}/interactions", response_model=list[InteractionResponse])
async def get_customer_interactions(
    customer_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> list[InteractionResponse]:
    try:
        interactions = await list_interactions(session, current_user, customer_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return [InteractionResponse.model_validate(interaction) for interaction in interactions]


@router.post(
    "/{customer_id}/interactions",
    response_model=InteractionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_customer_interaction(
    customer_id: UUID,
    payload: InteractionCreateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> InteractionResponse:
    try:
        interaction = await add_interaction(session, current_user, customer_id, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await session.commit()
    await session.refresh(interaction)
    return InteractionResponse.model_validate(interaction)
