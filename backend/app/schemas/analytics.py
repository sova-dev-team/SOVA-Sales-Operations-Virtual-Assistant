from datetime import date
from uuid import UUID

from app.schemas.base import APIModel


class OverviewResponse(APIModel):
    total_customers: int
    new_customers: int
    active_customers: int
    interactions: int
    follow_ups_due: int
    follow_up_rate: float | None


class ProductCustomerCount(APIModel):
    product_id: UUID
    product_sku: str
    product_name: str
    customer_count: int


class InteractionTrendPoint(APIModel):
    date: date
    count: int


class InteractionsTrendResponse(APIModel):
    points: list[InteractionTrendPoint]
