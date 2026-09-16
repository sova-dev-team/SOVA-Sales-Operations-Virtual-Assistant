from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SupportTicket, TicketComment, User
from app.models.entities import TicketStatus, UserRole
from app.schemas.support import (
    SupportTicketCreateRequest,
    SupportTicketUpdateRequest,
    TicketCommentCreateRequest,
)
from app.services.audit import record_audit


async def list_tickets(session: AsyncSession, user: User) -> list[SupportTicket]:
    statement = select(SupportTicket).order_by(SupportTicket.updated_at.desc())
    if user.role is UserRole.STAFF:
        statement = statement.where(
            (SupportTicket.created_by_id == user.id) | (SupportTicket.assignee_id == user.id)
        )
    return list((await session.scalars(statement)).all())


async def get_ticket(session: AsyncSession, user: User, ticket_id: UUID) -> SupportTicket | None:
    statement = select(SupportTicket).where(SupportTicket.id == ticket_id)
    if user.role is UserRole.STAFF:
        statement = statement.where(
            (SupportTicket.created_by_id == user.id) | (SupportTicket.assignee_id == user.id)
        )
    result = await session.scalars(statement)
    return result.first()


async def get_comments(session: AsyncSession, ticket_id: UUID) -> list[TicketComment]:
    return list(
        (
            await session.scalars(
                select(TicketComment)
                .where(TicketComment.ticket_id == ticket_id)
                .order_by(TicketComment.created_at, TicketComment.id)
            )
        ).all()
    )


async def create_ticket(
    session: AsyncSession, user: User, payload: SupportTicketCreateRequest
) -> SupportTicket:
    ticket = SupportTicket(
        created_by_id=user.id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category,
        priority=payload.priority,
    )
    session.add(ticket)
    await session.flush()
    await record_audit(
        session,
        actor_id=user.id,
        action="support_ticket.created",
        entity_type="support_ticket",
        entity_id=ticket.id,
        metadata={"priority": ticket.priority.value, "category": ticket.category.value},
    )
    return ticket


async def update_ticket(
    session: AsyncSession,
    user: User,
    ticket_id: UUID,
    payload: SupportTicketUpdateRequest,
) -> SupportTicket:
    ticket = await get_ticket(session, user, ticket_id)
    if ticket is None:
        raise LookupError("Support ticket not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "assignee_id" in changes and user.role is UserRole.STAFF:
        raise PermissionError("Only an Admin can assign support tickets.")
    if ticket.status is TicketStatus.CLOSED:
        raise RuntimeError("A closed ticket cannot be changed.")
    if "assignee_id" in changes and changes["assignee_id"] is not None:
        assignee = await session.get(User, changes["assignee_id"])
        if assignee is None or not assignee.is_active:
            raise LookupError("Ticket assignee not found.")
    if "status" in changes and changes["status"] is not None:
        new_status = changes["status"]
        if user.role is UserRole.STAFF and new_status in {
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
        }:
            raise PermissionError("Only an Admin can resolve or close support tickets.")
        if ticket.status is TicketStatus.RESOLVED and new_status is TicketStatus.OPEN:
            raise RuntimeError("A resolved ticket cannot be reopened directly.")
        ticket.status = new_status
    if "priority" in changes and changes["priority"] is not None:
        ticket.priority = changes["priority"]
    if "assignee_id" in changes:
        ticket.assignee_id = changes["assignee_id"]
    await record_audit(
        session,
        actor_id=user.id,
        action="support_ticket.updated",
        entity_type="support_ticket",
        entity_id=ticket.id,
        metadata={"fields": list(changes)},
    )
    return ticket


async def add_comment(
    session: AsyncSession,
    user: User,
    ticket_id: UUID,
    payload: TicketCommentCreateRequest,
) -> TicketComment:
    ticket = await get_ticket(session, user, ticket_id)
    if ticket is None:
        raise LookupError("Support ticket not found.")
    if ticket.status is TicketStatus.CLOSED:
        raise RuntimeError("A closed ticket cannot receive comments.")
    comment = TicketComment(ticket_id=ticket.id, author_id=user.id, body=payload.body.strip())
    session.add(comment)
    await session.flush()
    await record_audit(
        session,
        actor_id=user.id,
        action="support_ticket.comment_added",
        entity_type="support_ticket",
        entity_id=ticket.id,
    )
    return comment
