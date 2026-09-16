from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from app.core.security import PasswordHasher
from app.models import (
    Customer,
    CustomerInteraction,
    CustomerInterest,
    Product,
    User,
)
from app.models.entities import (
    CustomerStatus,
    EmailDraftStatus,
    EmailLanguage,
    EmailPurpose,
    EmailTone,
    InteractionType,
    InterestLevel,
    TicketPriority,
    TicketStatus,
    UserRole,
)
from app.schemas.customers import (
    CustomerCreateRequest,
    CustomerUpdateRequest,
    InteractionCreateRequest,
)
from app.schemas.email_drafts import (
    EmailDraftGenerateRequest,
    EmailDraftRejectRequest,
    EmailDraftReviewRequest,
    EmailDraftUpdateRequest,
)
from app.schemas.support import (
    SupportTicketCreateRequest,
    SupportTicketUpdateRequest,
    TicketCommentCreateRequest,
)
from app.services.analytics import _follow_up_rate, customers_by_product, interaction_trend
from app.services.audit import redact_metadata
from app.services.customers import (
    add_interaction,
    archive_customer,
    create_customer,
    list_customers,
    list_follow_ups,
    list_interactions,
    update_customer,
)
from app.services.email_drafts import (
    approve_draft,
    generate_draft,
    reject_draft,
    review_draft,
    update_draft,
)
from app.services.imports import parse_customer_file
from app.services.support import add_comment, create_ticket, get_comments, update_ticket
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _user(
    factory: async_sessionmaker[AsyncSession], email: str, role: UserRole = UserRole.STAFF
) -> User:
    async with factory() as session:
        user = User(
            email=email,
            full_name=email,
            password_hash=PasswordHasher().hash("password-123"),
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.mark.asyncio
async def test_customer_service_covers_filters_updates_interactions_and_archive(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    staff = await _user(session_factory, "edge-staff@example.com")
    other = await _user(session_factory, "edge-other@example.com")
    async with session_factory() as session:
        customer = await create_customer(
            session,
            staff,
            CustomerCreateRequest(company_name="Edge Co", contact_name="Edge Contact"),
        )
        await session.commit()
        await session.refresh(customer)
        customers, total = await list_customers(
            session,
            staff,
            page=1,
            page_size=10,
            search="edge",
            status=CustomerStatus.ACTIVE,
            owner_id=other.id,
            sort_by="companyName",
        )
        assert customers == []
        assert total == 0
        updated = await update_customer(
            session,
            staff,
            customer.id,
            CustomerUpdateRequest(company_name="Edge Co Updated", phone=" 0900 "),
        )
        assert updated.phone == "0900"
        interaction = await add_interaction(
            session,
            staff,
            customer.id,
            InteractionCreateRequest(
                type=InteractionType.NOTE,
                summary="Note",
                occurred_at=datetime.now(UTC),
            ),
        )
        assert len(await list_interactions(session, staff, customer.id)) == 1
        assert interaction.customer_id == customer.id
        await archive_customer(session, staff, customer.id)
        await session.commit()
        assert customer.status is CustomerStatus.ARCHIVED


@pytest.mark.asyncio
async def test_follow_up_service_handles_old_customer_and_staff_reassignment_guard(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    staff = await _user(session_factory, "follow-edge@example.com")
    other = await _user(session_factory, "follow-other@example.com")
    async with session_factory() as session:
        customer = Customer(
            company_name="Old Co",
            contact_name="Old Contact",
            owner_id=staff.id,
            created_at=datetime.now(UTC) - timedelta(days=30),
            updated_at=datetime.now(UTC) - timedelta(days=30),
        )
        session.add(customer)
        await session.commit()
        await session.refresh(customer)
        due = await list_follow_ups(session, staff, 7)
        assert due and due[0][0].id == customer.id
        with pytest.raises(PermissionError):
            await update_customer(
                session,
                staff,
                customer.id,
                CustomerUpdateRequest(owner_id=other.id),
            )


@pytest.mark.asyncio
async def test_email_state_machine_covers_edit_review_reject_and_terminal_states(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    staff = await _user(session_factory, "email-edge@example.com")
    async with session_factory() as session:
        customer = await create_customer(
            session,
            staff,
            CustomerCreateRequest(company_name="Email Co", contact_name="Email Contact"),
        )
        await session.commit()
        await session.refresh(customer)
        payload = EmailDraftGenerateRequest(
            customer_id=customer.id,
            purpose=EmailPurpose.FOLLOW_UP,
            language=EmailLanguage.EN,
            tone=EmailTone.CONCISE,
        )
        draft = await generate_draft(session, staff, payload)
        await update_draft(session, staff, draft.id, EmailDraftUpdateRequest(subject="Edited"))
        await review_draft(
            session,
            staff,
            draft.id,
            EmailDraftReviewRequest(body="Reviewed body"),
        )
        await approve_draft(session, staff, draft.id)
        with pytest.raises(RuntimeError):
            await update_draft(session, staff, draft.id, EmailDraftUpdateRequest(subject="No"))
        with pytest.raises(RuntimeError):
            await reject_draft(session, staff, draft.id, EmailDraftRejectRequest(reason="No"))

        rejected = await generate_draft(session, staff, payload)
        await reject_draft(
            session, staff, rejected.id, EmailDraftRejectRequest(reason="Needs rewrite")
        )
        assert rejected.status is EmailDraftStatus.REJECTED


@pytest.mark.asyncio
async def test_support_service_covers_comment_and_closed_guards(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    staff = await _user(session_factory, "support-edge@example.com")
    async with session_factory() as session:
        ticket = await create_ticket(
            session,
            staff,
            SupportTicketCreateRequest(
                title="Edge ticket",
                description="Description",
                category="software",
                priority=TicketPriority.HIGH,
            ),
        )
        await session.commit()
        await add_comment(session, staff, ticket.id, TicketCommentCreateRequest(body="Comment"))
        await update_ticket(
            session,
            staff,
            ticket.id,
            SupportTicketUpdateRequest(
                status=TicketStatus.IN_PROGRESS, priority=TicketPriority.LOW
            ),
        )
        assert len(await get_comments(session, ticket.id)) == 1
        with pytest.raises(PermissionError):
            await update_ticket(
                session,
                staff,
                ticket.id,
                SupportTicketUpdateRequest(status=TicketStatus.RESOLVED),
            )
        ticket.status = TicketStatus.CLOSED
        await session.commit()
        with pytest.raises(RuntimeError):
            await update_ticket(
                session, staff, ticket.id, SupportTicketUpdateRequest(priority=TicketPriority.HIGH)
            )


@pytest.mark.asyncio
async def test_analytics_and_audit_service_edges(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    staff = await _user(session_factory, "analytics-edge@example.com")
    async with session_factory() as session:
        product = Product(sku="EDGE", name="Edge Product")
        customer = Customer(
            company_name="Analytics Edge", contact_name="Contact", owner_id=staff.id
        )
        session.add_all([product, customer])
        await session.flush()
        session.add(
            CustomerInterest(
                customer_id=customer.id,
                product_id=product.id,
                interest_level=InterestLevel.MEDIUM,
            )
        )
        session.add(
            CustomerInteraction(
                customer_id=customer.id,
                user_id=staff.id,
                type=InteractionType.CALL,
                summary="Call",
                occurred_at=datetime.now(UTC),
            )
        )
        await session.commit()
        products = await customers_by_product(session, staff)
        trend = await interaction_trend(
            session,
            staff,
            datetime.now(UTC) - timedelta(days=1),
            datetime.now(UTC) + timedelta(days=1),
        )
        assert products[0].customer_count == 1
        assert trend[0].count == 1
    redacted = redact_metadata({"password": "secret", "nested": {"token": "x", "safe": 1}})
    assert redacted == {"password": "[REDACTED]", "nested": {"token": "[REDACTED]", "safe": 1}}


def test_follow_up_rate_counts_completed_and_open_cycles() -> None:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    end = datetime(2026, 1, 10, tzinfo=UTC)
    completed_customer = Customer(
        id=UUID("00000000-0000-0000-0000-000000000010"),
        company_name="Completed Co",
        contact_name="Contact",
        owner_id=UUID("00000000-0000-0000-0000-000000000001"),
        created_at=datetime(2026, 1, 3, tzinfo=UTC),
    )
    open_customer = Customer(
        id=UUID("00000000-0000-0000-0000-000000000011"),
        company_name="Open Co",
        contact_name="Contact",
        owner_id=UUID("00000000-0000-0000-0000-000000000001"),
        created_at=datetime(2026, 1, 4, tzinfo=UTC),
    )
    interactions = [
        CustomerInteraction(
            customer_id=completed_customer.id,
            user_id=completed_customer.owner_id,
            type=InteractionType.CALL,
            summary="Completed follow-up",
            occurred_at=datetime(2026, 1, 6, tzinfo=UTC),
        )
    ]

    assert _follow_up_rate([completed_customer, open_customer], interactions, 7, start, end) == 0.5


@pytest.mark.asyncio
async def test_import_parser_rejects_bad_files_and_extra_columns() -> None:
    with pytest.raises(ValueError, match="Only CSV"):
        await parse_customer_file("customers.txt", b"company_name,contact_name\nA,B")
    with pytest.raises(OverflowError):
        await parse_customer_file("customers.csv", b"x" * (5 * 1024 * 1024 + 1))
    with pytest.raises(ValueError, match="Unsupported columns"):
        await parse_customer_file("customers.csv", b"company_name,contact_name,unknown\nA,B,C")
    with pytest.raises(ValueError, match="could not be read"):
        await parse_customer_file("customers.csv", b"company_name,contact_name\nA,B,C")
