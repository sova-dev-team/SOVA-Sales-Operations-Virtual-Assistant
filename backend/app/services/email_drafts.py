from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, CustomerInteraction, EmailDraft, User
from app.models.entities import EmailDraftStatus, UserRole
from app.schemas.email_drafts import (
    EmailDraftGenerateRequest,
    EmailDraftRejectRequest,
    EmailDraftReviewRequest,
    EmailDraftUpdateRequest,
)
from app.services.ai_provider import AIEmailProvider, EmailGenerationContext, FakeAIEmailProvider
from app.services.audit import record_audit


async def _customer_for_user(
    session: AsyncSession, user: User, customer_id: UUID
) -> Customer | None:
    statement = select(Customer).where(Customer.id == customer_id)
    if user.role is UserRole.STAFF:
        statement = statement.where(Customer.owner_id == user.id)
    result = await session.scalars(statement)
    return result.first()


async def generate_draft(
    session: AsyncSession,
    user: User,
    payload: EmailDraftGenerateRequest,
    provider: AIEmailProvider | None = None,
) -> EmailDraft:
    customer = await _customer_for_user(session, user, payload.customer_id)
    if customer is None:
        raise LookupError("Customer not found.")
    latest_summary = await session.scalar(
        select(CustomerInteraction.summary)
        .where(CustomerInteraction.customer_id == customer.id)
        .order_by(CustomerInteraction.occurred_at.desc())
        .limit(1)
    )
    context = EmailGenerationContext(customer.company_name, customer.contact_name, latest_summary)
    generated = await (provider or FakeAIEmailProvider()).generate(
        context, payload.purpose, payload.language, payload.tone
    )
    draft = EmailDraft(
        customer_id=customer.id,
        created_by_id=user.id,
        purpose=payload.purpose,
        language=payload.language,
        tone=payload.tone,
        subject=generated.subject,
        body=generated.body,
        status=EmailDraftStatus.DRAFT,
        provider=generated.provider,
        model=generated.model,
        prompt_version=generated.prompt_version,
    )
    session.add(draft)
    await session.flush()
    await record_audit(
        session,
        actor_id=user.id,
        action="email_draft.generated",
        entity_type="email_draft",
        entity_id=draft.id,
        metadata={"provider": draft.provider, "model": draft.model},
    )
    return draft


async def get_draft(session: AsyncSession, user: User, draft_id: UUID) -> EmailDraft | None:
    statement = select(EmailDraft).where(EmailDraft.id == draft_id)
    if user.role is UserRole.STAFF:
        statement = statement.where(EmailDraft.created_by_id == user.id)
    result = await session.scalars(statement)
    return result.first()


async def list_drafts(session: AsyncSession, user: User) -> list[EmailDraft]:
    statement = select(EmailDraft).order_by(EmailDraft.created_at.desc())
    if user.role is UserRole.STAFF:
        statement = statement.where(EmailDraft.created_by_id == user.id)
    return list((await session.scalars(statement)).all())


async def update_draft(
    session: AsyncSession,
    user: User,
    draft_id: UUID,
    payload: EmailDraftUpdateRequest,
) -> EmailDraft:
    draft = await get_draft(session, user, draft_id)
    if draft is None:
        raise LookupError("Email draft not found.")
    if draft.status in {EmailDraftStatus.APPROVED, EmailDraftStatus.REJECTED}:
        raise RuntimeError("This email draft can no longer be edited.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(draft, field, value.strip())
    await record_audit(
        session,
        actor_id=user.id,
        action="email_draft.updated",
        entity_type="email_draft",
        entity_id=draft.id,
        metadata={"fields": list(payload.model_dump(exclude_unset=True))},
    )
    return draft


async def review_draft(
    session: AsyncSession,
    user: User,
    draft_id: UUID,
    payload: EmailDraftReviewRequest,
) -> EmailDraft:
    draft = await get_draft(session, user, draft_id)
    if draft is None:
        raise LookupError("Email draft not found.")
    if draft.status is not EmailDraftStatus.DRAFT:
        raise RuntimeError("Only a draft can be reviewed.")
    if payload.subject is not None:
        draft.subject = payload.subject.strip()
    if payload.body is not None:
        draft.body = payload.body.strip()
    draft.status = EmailDraftStatus.REVIEWED
    await record_audit(
        session,
        actor_id=user.id,
        action="email_draft.reviewed",
        entity_type="email_draft",
        entity_id=draft.id,
    )
    return draft


async def approve_draft(session: AsyncSession, user: User, draft_id: UUID) -> EmailDraft:
    draft = await get_draft(session, user, draft_id)
    if draft is None:
        raise LookupError("Email draft not found.")
    if draft.status is not EmailDraftStatus.REVIEWED:
        raise RuntimeError("Only a reviewed draft can be approved.")
    draft.status = EmailDraftStatus.APPROVED
    await record_audit(
        session,
        actor_id=user.id,
        action="email_draft.approved",
        entity_type="email_draft",
        entity_id=draft.id,
    )
    return draft


async def reject_draft(
    session: AsyncSession,
    user: User,
    draft_id: UUID,
    payload: EmailDraftRejectRequest,
) -> EmailDraft:
    draft = await get_draft(session, user, draft_id)
    if draft is None:
        raise LookupError("Email draft not found.")
    if draft.status is EmailDraftStatus.APPROVED:
        raise RuntimeError("An approved draft cannot be rejected.")
    draft.status = EmailDraftStatus.REJECTED
    await record_audit(
        session,
        actor_id=user.id,
        action="email_draft.rejected",
        entity_type="email_draft",
        entity_id=draft.id,
        metadata={"reason": payload.reason or ""},
    )
    return draft
