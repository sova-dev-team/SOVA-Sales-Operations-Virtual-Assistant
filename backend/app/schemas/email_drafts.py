from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.entities import EmailDraftStatus, EmailLanguage, EmailPurpose, EmailTone
from app.schemas.base import APIModel


class EmailDraftGenerateRequest(APIModel):
    customer_id: UUID
    purpose: EmailPurpose
    language: EmailLanguage
    tone: EmailTone


class EmailDraftUpdateRequest(APIModel):
    subject: str | None = Field(default=None, min_length=1, max_length=300)
    body: str | None = Field(default=None, min_length=1, max_length=20_000)


class EmailDraftReviewRequest(APIModel):
    subject: str | None = Field(default=None, min_length=1, max_length=300)
    body: str | None = Field(default=None, min_length=1, max_length=20_000)


class EmailDraftRejectRequest(APIModel):
    reason: str | None = Field(default=None, max_length=500)


class EmailDraftResponse(APIModel):
    id: UUID
    customer_id: UUID
    created_by_id: UUID
    purpose: EmailPurpose
    language: EmailLanguage
    tone: EmailTone
    subject: str
    body: str
    status: EmailDraftStatus
    provider: str
    model: str
    prompt_version: str
    created_at: datetime
    updated_at: datetime
