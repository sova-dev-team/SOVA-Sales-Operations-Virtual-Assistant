from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, CustomerInteraction, User
from app.models.entities import CustomerStatus, UserRole
from app.schemas.customers import (
    CustomerCreateRequest,
    CustomerUpdateRequest,
    InteractionCreateRequest,
)
from app.services.audit import record_audit


def _scope(statement: Select[tuple[Customer]], user: User) -> Select[tuple[Customer]]:
    if user.role is UserRole.STAFF:
        return statement.where(Customer.owner_id == user.id)
    return statement


async def list_customers(
    session: AsyncSession,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    status: CustomerStatus | None,
    owner_id: UUID | None,
    sort_by: str,
) -> tuple[list[Customer], int]:
    filters = []
    if user.role is UserRole.STAFF:
        filters.append(Customer.owner_id == user.id)
    if search:
        like = f"%{search.strip()}%"
        filters.append((Customer.company_name.ilike(like)) | (Customer.contact_name.ilike(like)))
    if status:
        filters.append(Customer.status == status)
    if owner_id:
        filters.append(Customer.owner_id == owner_id)

    count_statement = select(func.count()).select_from(Customer).where(*filters)
    total = int(await session.scalar(count_statement) or 0)
    order_column = {
        "companyName": Customer.company_name,
        "updatedAt": Customer.updated_at,
        "createdAt": Customer.created_at,
    }.get(sort_by, Customer.updated_at)
    customers = list(
        (
            await session.scalars(
                select(Customer)
                .where(*filters)
                .order_by(order_column.desc(), Customer.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
    )
    return customers, total


async def get_customer(session: AsyncSession, user: User, customer_id: UUID) -> Customer | None:
    result = await session.scalars(_scope(select(Customer).where(Customer.id == customer_id), user))
    return result.first()


async def create_customer(
    session: AsyncSession,
    user: User,
    payload: CustomerCreateRequest,
) -> Customer:
    owner_id = payload.owner_id or user.id
    if user.role is UserRole.STAFF and owner_id != user.id:
        raise PermissionError("Staff can only create customers they own.")
    owner = await session.get(User, owner_id)
    if owner is None or not owner.is_active:
        raise LookupError("Customer owner not found.")
    customer = Customer(
        company_name=payload.company_name.strip(),
        contact_name=payload.contact_name.strip(),
        email=payload.email,
        phone=payload.phone.strip() if payload.phone else None,
        owner_id=owner_id,
    )
    session.add(customer)
    try:
        await session.flush()
    except IntegrityError as error:
        await session.rollback()
        raise ValueError("Customer could not be created.") from error
    await record_audit(
        session,
        actor_id=user.id,
        action="customer.created",
        entity_type="customer",
        entity_id=customer.id,
    )
    return customer


async def update_customer(
    session: AsyncSession,
    user: User,
    customer_id: UUID,
    payload: CustomerUpdateRequest,
) -> Customer:
    customer = await get_customer(session, user, customer_id)
    if customer is None:
        raise LookupError("Customer not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "owner_id" in changes and changes["owner_id"] != customer.owner_id:
        if user.role is UserRole.STAFF:
            raise PermissionError("Staff cannot reassign customer ownership.")
        owner = await session.get(User, changes["owner_id"])
        if owner is None or not owner.is_active:
            raise LookupError("Customer owner not found.")
    for field in ("company_name", "contact_name", "email", "phone", "owner_id", "status"):
        if field in changes:
            value = changes[field]
            if field in {"company_name", "contact_name", "phone"} and isinstance(value, str):
                value = value.strip()
            setattr(customer, field, value)
    await record_audit(
        session,
        actor_id=user.id,
        action="customer.updated",
        entity_type="customer",
        entity_id=customer.id,
        metadata={"fields": list(changes)},
    )
    return customer


async def archive_customer(session: AsyncSession, user: User, customer_id: UUID) -> Customer:
    customer = await get_customer(session, user, customer_id)
    if customer is None:
        raise LookupError("Customer not found.")
    customer.status = CustomerStatus.ARCHIVED
    await record_audit(
        session,
        actor_id=user.id,
        action="customer.archived",
        entity_type="customer",
        entity_id=customer.id,
    )
    return customer


async def add_interaction(
    session: AsyncSession,
    user: User,
    customer_id: UUID,
    payload: InteractionCreateRequest,
) -> CustomerInteraction:
    customer = await get_customer(session, user, customer_id)
    if customer is None:
        raise LookupError("Customer not found.")
    occurred_at = payload.occurred_at
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=UTC)
    else:
        occurred_at = occurred_at.astimezone(UTC)
    interaction = CustomerInteraction(
        customer_id=customer.id,
        user_id=user.id,
        type=payload.type,
        summary=payload.summary.strip(),
        occurred_at=occurred_at,
    )
    session.add(interaction)
    await record_audit(
        session,
        actor_id=user.id,
        action="interaction.created",
        entity_type="customer_interaction",
        entity_id=interaction.id,
    )
    return interaction


async def list_interactions(
    session: AsyncSession, user: User, customer_id: UUID
) -> list[CustomerInteraction]:
    customer = await get_customer(session, user, customer_id)
    if customer is None:
        raise LookupError("Customer not found.")
    return list(
        (
            await session.scalars(
                select(CustomerInteraction)
                .where(CustomerInteraction.customer_id == customer_id)
                .order_by(CustomerInteraction.occurred_at.desc(), CustomerInteraction.id)
            )
        ).all()
    )


async def list_follow_ups(
    session: AsyncSession, user: User, interval_days: int
) -> list[tuple[Customer, datetime | None, datetime | None]]:
    filters = [Customer.status != CustomerStatus.ARCHIVED]
    if user.role is UserRole.STAFF:
        filters.append(Customer.owner_id == user.id)
    customers = list((await session.scalars(select(Customer).where(*filters))).all())
    now = datetime.now(UTC)
    due: list[tuple[Customer, datetime | None, datetime | None]] = []
    for customer in customers:
        latest = await session.scalar(
            select(CustomerInteraction.occurred_at)
            .where(CustomerInteraction.customer_id == customer.id)
            .order_by(CustomerInteraction.occurred_at.desc())
            .limit(1)
        )
        if latest is not None and latest.tzinfo is None:
            latest = latest.replace(tzinfo=UTC)
        due_since = (latest + timedelta(days=interval_days)) if latest else customer.created_at
        if due_since.tzinfo is None:
            due_since = due_since.replace(tzinfo=UTC)
        if due_since <= now:
            due.append((customer, latest, due_since))
    return due
