from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.models.entities import CustomerStatus, InteractionType
from app.schemas.base import APIModel


class CustomerCreateRequest(APIModel):
    company_name: str = Field(min_length=1, max_length=200)
    contact_name: str = Field(min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    owner_id: UUID | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized and (
            "@" not in normalized or normalized.startswith("@") or normalized.endswith("@")
        ):
            raise ValueError("Enter a valid email address.")
        return normalized or None


class CustomerUpdateRequest(APIModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=200)
    contact_name: str | None = Field(default=None, min_length=1, max_length=160)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    owner_id: UUID | None = None
    status: CustomerStatus | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized and (
            "@" not in normalized or normalized.startswith("@") or normalized.endswith("@")
        ):
            raise ValueError("Enter a valid email address.")
        return normalized or None


class CustomerResponse(APIModel):
    id: UUID
    company_name: str
    contact_name: str
    email: str | None
    phone: str | None
    status: CustomerStatus
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


class InteractionCreateRequest(APIModel):
    type: InteractionType
    summary: str = Field(min_length=1, max_length=5000)
    occurred_at: datetime


class InteractionResponse(APIModel):
    id: UUID
    customer_id: UUID
    user_id: UUID
    type: InteractionType
    summary: str
    occurred_at: datetime
    created_at: datetime


class FollowUpResponse(APIModel):
    customer: CustomerResponse
    last_interaction_at: datetime | None
    due_since: datetime | None
