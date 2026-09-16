from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.entities import TicketCategory, TicketPriority, TicketStatus
from app.schemas.base import APIModel


class SupportTicketCreateRequest(APIModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=10_000)
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM


class SupportTicketUpdateRequest(APIModel):
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    assignee_id: UUID | None = None


class TicketCommentCreateRequest(APIModel):
    body: str = Field(min_length=1, max_length=10_000)


class TicketCommentResponse(APIModel):
    id: UUID
    ticket_id: UUID
    author_id: UUID
    body: str
    created_at: datetime


class SupportTicketResponse(APIModel):
    id: UUID
    created_by_id: UUID
    assignee_id: UUID | None
    title: str
    description: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    created_at: datetime
    updated_at: datetime


class SupportTicketDetailResponse(SupportTicketResponse):
    comments: list[TicketCommentResponse]
