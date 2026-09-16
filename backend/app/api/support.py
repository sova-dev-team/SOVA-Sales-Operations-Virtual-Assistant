from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import DbSession, StaffOrAdminUser
from app.models import SupportTicket
from app.schemas.support import (
    SupportTicketCreateRequest,
    SupportTicketDetailResponse,
    SupportTicketResponse,
    SupportTicketUpdateRequest,
    TicketCommentCreateRequest,
    TicketCommentResponse,
)
from app.services.support import (
    add_comment,
    create_ticket,
    get_comments,
    get_ticket,
    list_tickets,
    update_ticket,
)

router = APIRouter(prefix="/api/v1/support-tickets", tags=["support"])


@router.get("", response_model=list[SupportTicketResponse])
async def get_support_tickets(
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> list[SupportTicket]:
    return await list_tickets(session, current_user)


@router.post("", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
async def post_support_ticket(
    payload: SupportTicketCreateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> SupportTicket:
    ticket = await create_ticket(session, current_user, payload)
    await session.commit()
    await session.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=SupportTicketDetailResponse)
async def get_support_ticket(
    ticket_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> SupportTicketDetailResponse:
    ticket = await get_ticket(session, current_user, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Support ticket not found.")
    comments = await get_comments(session, ticket.id)
    return SupportTicketDetailResponse(
        **SupportTicketResponse.model_validate(ticket).model_dump(),
        comments=[TicketCommentResponse.model_validate(comment) for comment in comments],
    )


@router.patch("/{ticket_id}", response_model=SupportTicketResponse)
async def patch_support_ticket(
    ticket_id: UUID,
    payload: SupportTicketUpdateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> SupportTicket:
    from fastapi import HTTPException

    try:
        ticket = await update_ticket(session, current_user, ticket_id, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await session.commit()
    await session.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse, status_code=201)
async def post_ticket_comment(
    ticket_id: UUID,
    payload: TicketCommentCreateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> TicketCommentResponse:
    try:
        comment = await add_comment(session, current_user, ticket_id, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await session.commit()
    await session.refresh(comment)
    return TicketCommentResponse.model_validate(comment)
