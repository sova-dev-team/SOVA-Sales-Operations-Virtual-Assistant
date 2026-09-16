from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import DbSession, StaffOrAdminUser
from app.models import EmailDraft
from app.schemas.email_drafts import (
    EmailDraftGenerateRequest,
    EmailDraftRejectRequest,
    EmailDraftResponse,
    EmailDraftReviewRequest,
    EmailDraftUpdateRequest,
)
from app.services.email_drafts import (
    approve_draft,
    generate_draft,
    get_draft,
    list_drafts,
    reject_draft,
    review_draft,
    update_draft,
)

router = APIRouter(prefix="/api/v1/email-drafts", tags=["email-drafts"])


@router.post("/generate", response_model=EmailDraftResponse, status_code=status.HTTP_201_CREATED)
async def generate_email_draft(
    payload: EmailDraftGenerateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> EmailDraft:
    try:
        draft = await generate_draft(session, current_user, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await session.commit()
    await session.refresh(draft)
    return draft


@router.get("", response_model=list[EmailDraftResponse])
async def get_email_drafts(
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> list[EmailDraft]:
    return await list_drafts(session, current_user)


@router.get("/{email_draft_id}", response_model=EmailDraftResponse)
async def get_email_draft(
    email_draft_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> EmailDraft:
    draft = await get_draft(session, current_user, email_draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Email draft not found.")
    return draft


@router.patch("/{email_draft_id}", response_model=EmailDraftResponse)
async def patch_email_draft(
    email_draft_id: UUID,
    payload: EmailDraftUpdateRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> EmailDraft:
    try:
        draft = await update_draft(session, current_user, email_draft_id, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await session.commit()
    await session.refresh(draft)
    return draft


@router.post("/{email_draft_id}/review", response_model=EmailDraftResponse)
async def review_email_draft(
    email_draft_id: UUID,
    payload: EmailDraftReviewRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> EmailDraft:
    try:
        draft = await review_draft(session, current_user, email_draft_id, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await session.commit()
    await session.refresh(draft)
    return draft


@router.post("/{email_draft_id}/approve", response_model=EmailDraftResponse)
async def approve_email_draft(
    email_draft_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> EmailDraft:
    try:
        draft = await approve_draft(session, current_user, email_draft_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await session.commit()
    await session.refresh(draft)
    return draft


@router.post("/{email_draft_id}/reject", response_model=EmailDraftResponse)
async def reject_email_draft(
    email_draft_id: UUID,
    payload: EmailDraftRejectRequest,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> EmailDraft:
    try:
        draft = await reject_draft(session, current_user, email_draft_id, payload)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await session.commit()
    await session.refresh(draft)
    return draft
