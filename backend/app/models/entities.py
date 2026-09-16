from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UuidPrimaryKeyMixin, utc_now


class UserRole(StrEnum):
    ADMIN = "admin"
    STAFF = "staff"


class CustomerStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class InterestLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class InteractionType(StrEnum):
    CALL = "call"
    MEETING = "meeting"
    EMAIL = "email"
    QUOTE = "quote"
    NOTE = "note"


class ImportJobStatus(StrEnum):
    PREVIEW = "preview"
    READY = "ready"
    COMMITTED = "committed"
    FAILED = "failed"


class EmailPurpose(StrEnum):
    FOLLOW_UP = "followUp"
    INTRODUCTION = "introduction"
    REENGAGEMENT = "reengagement"


class EmailLanguage(StrEnum):
    VI = "vi"
    EN = "en"


class EmailTone(StrEnum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CONCISE = "concise"


class EmailDraftStatus(StrEnum):
    DRAFT = "draft"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"


class TicketCategory(StrEnum):
    HARDWARE = "hardware"
    SOFTWARE = "software"
    ACCESS = "access"
    OTHER = "other"


class TicketPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    CLOSED = "closed"


def enum_column(enum_type: type[StrEnum]) -> Enum:
    return Enum(enum_type, native_enum=False, validate_strings=True)


class User(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    email: Mapped[str] = mapped_column(String(320), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        enum_column(UserRole), default=UserRole.STAFF, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)


class RefreshSession(UuidPrimaryKeyMixin, Base):
    __tablename__ = "refresh_sessions"
    __table_args__ = (Index("ix_refresh_sessions_user_expires", "user_id", "expires_at"),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class Customer(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        Index("ix_customers_owner_id_status", "owner_id", "status"),
        Index("ix_customers_email", "email"),
    )

    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[CustomerStatus] = mapped_column(
        enum_column(CustomerStatus), default=CustomerStatus.ACTIVE, nullable=False
    )
    owner_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class Product(UuidPrimaryKeyMixin, Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("sku", name="uq_products_sku"),)

    sku: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class CustomerInterest(UuidPrimaryKeyMixin, Base):
    __tablename__ = "customer_interests"
    __table_args__ = (
        UniqueConstraint(
            "customer_id", "product_id", name="uq_customer_interests_customer_product"
        ),
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    interest_level: Mapped[InterestLevel] = mapped_column(
        enum_column(InterestLevel), default=InterestLevel.MEDIUM, nullable=False
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class CustomerInteraction(UuidPrimaryKeyMixin, Base):
    __tablename__ = "customer_interactions"
    __table_args__ = (
        Index("ix_customer_interactions_customer_occurred", "customer_id", "occurred_at"),
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    type: Mapped[InteractionType] = mapped_column(enum_column(InteractionType), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class ImportJob(UuidPrimaryKeyMixin, Base):
    __tablename__ = "import_jobs"

    created_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ImportJobStatus] = mapped_column(
        enum_column(ImportJobStatus), default=ImportJobStatus.PREVIEW, nullable=False
    )
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    completed_at: Mapped[Any | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportErrorRecord(UuidPrimaryKeyMixin, Base):
    __tablename__ = "import_errors"
    __table_args__ = (Index("ix_import_errors_job_row", "import_job_id", "row_number"),)

    import_job_id: Mapped[UUID] = mapped_column(
        ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    field_name: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)


class EmailDraft(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "email_drafts"
    __table_args__ = (Index("ix_email_drafts_customer_created", "customer_id", "created_at"),)

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )
    created_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    purpose: Mapped[EmailPurpose] = mapped_column(enum_column(EmailPurpose), nullable=False)
    language: Mapped[EmailLanguage] = mapped_column(enum_column(EmailLanguage), nullable=False)
    tone: Mapped[EmailTone] = mapped_column(enum_column(EmailTone), nullable=False)
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[EmailDraftStatus] = mapped_column(
        enum_column(EmailDraftStatus), default=EmailDraftStatus.DRAFT, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(80), nullable=False)


class SupportTicket(UuidPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index("ix_support_tickets_status_priority_assignee", "status", "priority", "assignee_id"),
    )

    created_by_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    assignee_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[TicketCategory] = mapped_column(enum_column(TicketCategory), nullable=False)
    priority: Mapped[TicketPriority] = mapped_column(enum_column(TicketPriority), nullable=False)
    status: Mapped[TicketStatus] = mapped_column(
        enum_column(TicketStatus), default=TicketStatus.OPEN, nullable=False
    )


class TicketComment(UuidPrimaryKeyMixin, Base):
    __tablename__ = "ticket_comments"

    ticket_id: Mapped[UUID] = mapped_column(
        ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class AuditLog(UuidPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity_created", "entity_type", "entity_id", "created_at"),
    )

    actor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSON, default=dict, nullable=False
    )
    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
