from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Customer, CustomerInteraction, CustomerInterest, Product, User
from app.models.entities import CustomerStatus, UserRole
from app.schemas.analytics import (
    InteractionTrendPoint,
    OverviewResponse,
    ProductCustomerCount,
)
from app.services.customers import list_follow_ups


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


async def _visible_customer_ids(session: AsyncSession, user: User) -> set[UUID]:
    statement = select(Customer.id).where(Customer.status != CustomerStatus.ARCHIVED)
    if user.role is UserRole.STAFF:
        statement = statement.where(Customer.owner_id == user.id)
    return set((await session.scalars(statement)).all())


async def overview(
    session: AsyncSession,
    user: User,
    settings: Settings,
    start: datetime,
    end: datetime,
) -> OverviewResponse:
    visible_ids = await _visible_customer_ids(session, user)
    customers = (
        list((await session.scalars(select(Customer).where(Customer.id.in_(visible_ids)))).all())
        if visible_ids
        else []
    )
    interactions = (
        list(
            (
                await session.scalars(
                    select(CustomerInteraction).where(
                        CustomerInteraction.customer_id.in_(visible_ids),
                        CustomerInteraction.occurred_at >= start,
                        CustomerInteraction.occurred_at < end,
                    )
                )
            ).all()
        )
        if visible_ids
        else []
    )
    active_cutoff = datetime.now(UTC) - timedelta(days=90)
    active_interactions = (
        list(
            (
                await session.scalars(
                    select(CustomerInteraction).where(
                        CustomerInteraction.customer_id.in_(visible_ids),
                        CustomerInteraction.occurred_at >= active_cutoff,
                    )
                )
            ).all()
        )
        if visible_ids
        else []
    )
    active_ids = {item.customer_id for item in active_interactions}
    all_interactions = (
        list(
            (
                await session.scalars(
                    select(CustomerInteraction)
                    .where(CustomerInteraction.customer_id.in_(visible_ids))
                    .order_by(CustomerInteraction.customer_id, CustomerInteraction.occurred_at)
                )
            ).all()
        )
        if visible_ids
        else []
    )
    due = await list_follow_ups(session, user, settings.follow_up_interval_days)
    return OverviewResponse(
        total_customers=len(customers),
        new_customers=sum(start <= _utc(item.created_at) < end for item in customers),
        active_customers=len(active_ids),
        interactions=len(interactions),
        follow_ups_due=len(due),
        follow_up_rate=_follow_up_rate(
            customers,
            all_interactions,
            settings.follow_up_interval_days,
            start,
            end,
        ),
    )


def _follow_up_rate(
    customers: list[Customer],
    interactions: list[CustomerInteraction],
    interval_days: int,
    start: datetime,
    end: datetime,
) -> float | None:
    """Return completed follow-up cycles / cycles that became due in the range."""
    interactions_by_customer: dict[UUID, list[datetime]] = defaultdict(list)
    for interaction in interactions:
        interactions_by_customer[interaction.customer_id].append(_utc(interaction.occurred_at))

    due_count = 0
    completed_count = 0
    interval = timedelta(days=interval_days)
    for customer in customers:
        due_at = _utc(customer.created_at)
        for occurred_at in interactions_by_customer.get(customer.id, []):
            # An interaction before the due time resets the cycle without a
            # follow-up ever becoming due.
            if occurred_at <= due_at:
                due_at = occurred_at + interval
                continue
            if start <= due_at < end:
                due_count += 1
                if occurred_at < end:
                    completed_count += 1
            due_at = occurred_at + interval
        if start <= due_at < end:
            due_count += 1

    return completed_count / due_count if due_count else None


async def customers_by_product(session: AsyncSession, user: User) -> list[ProductCustomerCount]:
    visible_ids = await _visible_customer_ids(session, user)
    if not visible_ids:
        return []
    interests = list(
        (
            await session.scalars(
                select(CustomerInterest).where(CustomerInterest.customer_id.in_(visible_ids))
            )
        ).all()
    )
    products = (
        {
            product.id: product
            for product in (
                await session.scalars(
                    select(Product).where(Product.id.in_({item.product_id for item in interests}))
                )
            ).all()
        }
        if interests
        else {}
    )
    counts = Counter(item.product_id for item in interests)
    return [
        ProductCustomerCount(
            product_id=product_id,
            product_sku=products[product_id].sku,
            product_name=products[product_id].name,
            customer_count=count,
        )
        for product_id, count in counts.most_common()
        if product_id in products
    ]


async def interaction_trend(
    session: AsyncSession,
    user: User,
    start: datetime,
    end: datetime,
) -> list[InteractionTrendPoint]:
    visible_ids = await _visible_customer_ids(session, user)
    if not visible_ids:
        return []
    interactions = list(
        (
            await session.scalars(
                select(CustomerInteraction).where(
                    CustomerInteraction.customer_id.in_(visible_ids),
                    CustomerInteraction.occurred_at >= start,
                    CustomerInteraction.occurred_at < end,
                )
            )
        ).all()
    )
    counts: dict[date, int] = defaultdict(int)
    for item in interactions:
        counts[_utc(item.occurred_at).date()] += 1
    return [InteractionTrendPoint(date=point, count=counts[point]) for point in sorted(counts)]
