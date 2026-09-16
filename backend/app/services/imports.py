import csv
import io
from asyncio import to_thread
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import PurePath
from typing import Any

from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Customer,
    CustomerInteraction,
    CustomerInterest,
    ImportErrorRecord,
    ImportJob,
    Product,
    User,
)
from app.models.entities import ImportJobStatus, InteractionType, InterestLevel
from app.services.audit import record_audit

MAX_IMPORT_BYTES = 5 * 1024 * 1024
MAX_IMPORT_ROWS = 5_000
REQUIRED_COLUMNS = {"company_name", "contact_name"}
OPTIONAL_COLUMNS = {
    "email",
    "phone",
    "product_sku",
    "interest_level",
    "interaction_type",
    "interaction_summary",
    "interaction_date",
}


@dataclass(frozen=True)
class ParsedImport:
    rows: list[dict[str, Any]]
    errors: list[tuple[int, str, str]]
    total_rows: int


async def parse_customer_file(file_name: str, content: bytes) -> ParsedImport:
    return await to_thread(_parse_customer_file_sync, file_name, content)


def _parse_customer_file_sync(file_name: str, content: bytes) -> ParsedImport:
    suffix = PurePath(file_name).suffix.lower()
    if suffix not in {".csv", ".xlsx"}:
        raise ValueError("Only CSV and XLSX files are supported.")
    if len(content) > MAX_IMPORT_BYTES:
        raise OverflowError("The import file exceeds the 5 MB limit.")
    try:
        rows = _read_rows(suffix, content)
    except (UnicodeDecodeError, ValueError, KeyError) as error:
        raise ValueError("The import file could not be read.") from error
    if len(rows) > MAX_IMPORT_ROWS:
        raise OverflowError("The import file exceeds the 5,000 row limit.")
    if not rows:
        raise ValueError("The import file has no data rows.")
    columns = set(rows[0])
    missing = REQUIRED_COLUMNS - columns
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}.")
    unknown = columns - REQUIRED_COLUMNS - OPTIONAL_COLUMNS
    if unknown:
        raise ValueError(f"Unsupported columns: {', '.join(sorted(unknown))}.")

    valid_rows: list[dict[str, Any]] = []
    errors: list[tuple[int, str, str]] = []
    seen_keys: set[tuple[str, str]] = set()
    for row_number, raw_row in enumerate(rows, start=2):
        normalized: dict[str, Any] = {key: _clean(value) for key, value in raw_row.items()}
        if not any(normalized.values()):
            continue
        row_errors: list[tuple[str, str]] = []
        company_name = normalized.get("company_name", "")
        contact_name = normalized.get("contact_name", "")
        if not company_name:
            row_errors.append(("company_name", "Company name is required."))
        if not contact_name:
            row_errors.append(("contact_name", "Contact name is required."))
        email = normalized.get("email") or None
        if email and ("@" not in email or email.startswith("@") or email.endswith("@")):
            row_errors.append(("email", "Email address is invalid."))
        key = (company_name.casefold(), contact_name.casefold())
        if key in seen_keys:
            row_errors.append(("company_name", "Duplicate customer in this file."))
        seen_keys.add(key)
        interaction_type = normalized.get("interaction_type") or None
        if interaction_type and interaction_type not in {item.value for item in InteractionType}:
            row_errors.append(("interaction_type", "Interaction type is unsupported."))
        interest_level = normalized.get("interest_level") or None
        if interest_level and interest_level not in {item.value for item in InterestLevel}:
            row_errors.append(("interest_level", "Interest level is unsupported."))
        interaction_date = normalized.get("interaction_date") or None
        parsed_date: str | None = None
        if interaction_date:
            try:
                parsed_date = _parse_date(interaction_date).isoformat()
            except ValueError:
                row_errors.append(
                    ("interaction_date", "Interaction date must be ISO 8601 or YYYY-MM-DD.")
                )
        elif interaction_type or normalized.get("interaction_summary"):
            row_errors.append(
                ("interaction_date", "Interaction date is required with an interaction.")
            )
        if row_errors:
            errors.extend((row_number, field, message) for field, message in row_errors)
            continue
        normalized["email"] = email
        normalized["interaction_date"] = parsed_date
        normalized["_row_number"] = row_number
        valid_rows.append(normalized)
    return ParsedImport(valid_rows, errors, len(rows))


def _read_rows(suffix: str, content: bytes) -> list[dict[str, str]]:
    if suffix == ".csv":
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            return []
        headers = _normalize_headers(reader.fieldnames)
        reader.fieldnames = headers
        csv_output: list[dict[str, str]] = []
        for row in reader:
            if None in row:
                raise ValueError("A row contains more values than the header.")
            csv_output.append(
                {str(key): value or "" for key, value in row.items() if key is not None}
            )
        return csv_output
    workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    try:
        sheet = workbook.active
        if sheet is None:
            return []
        values = list(sheet.values)
    finally:
        workbook.close()
    if not values:
        return []
    headers = _normalize_headers(values[0])
    xlsx_output: list[dict[str, str]] = []
    for xlsx_row in values[1:]:
        if len(xlsx_row) > len(headers) and any(
            value is not None for value in xlsx_row[len(headers) :]
        ):
            raise ValueError("A row contains more values than the header.")
        xlsx_output.append(
            {
                header: ""
                if index >= len(xlsx_row) or xlsx_row[index] is None
                else str(xlsx_row[index])
                for index, header in enumerate(headers)
            }
        )
    return xlsx_output


def _normalize_headers(raw_headers: Any) -> list[str]:
    headers = [_clean(value).lower() for value in raw_headers]
    if not headers or any(not header for header in headers):
        raise ValueError("All columns must have a name.")
    if len(set(headers)) != len(headers):
        raise ValueError("Column names must be unique.")
    return headers


def _clean(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _parse_date(value: str) -> datetime:
    candidate = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(candidate)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


async def create_import_preview(
    session: AsyncSession, user: User, file_name: str, content: bytes
) -> ImportJob:
    parsed = await parse_customer_file(file_name, content)
    existing_emails = {
        value
        for value in (
            await session.scalars(
                select(Customer.email).where(
                    Customer.email.is_not(None),
                    Customer.email.in_([row["email"] for row in parsed.rows if row.get("email")]),
                )
            )
        ).all()
    }
    errors = list(parsed.errors)
    valid_rows: list[dict[str, Any]] = []
    for row in parsed.rows:
        row_number = int(row["_row_number"])
        if row.get("email") in existing_emails:
            errors.append((row_number, "email", "A customer with this email already exists."))
        else:
            valid_rows.append(row)
    invalid_row_numbers = {row_number for row_number, _, _ in errors}
    job = ImportJob(
        created_by_id=user.id,
        file_name=PurePath(file_name).name,
        status=ImportJobStatus.READY if not errors else ImportJobStatus.PREVIEW,
        total_rows=parsed.total_rows,
        valid_rows=len(valid_rows),
        invalid_rows=len(invalid_row_numbers),
        rows_json=valid_rows,
    )
    session.add(job)
    await session.flush()
    for row_number, field_name, message in errors:
        session.add(
            ImportErrorRecord(
                import_job_id=job.id,
                row_number=row_number,
                field_name=field_name,
                message=message,
            )
        )
    await record_audit(
        session,
        actor_id=user.id,
        action="import.previewed",
        entity_type="import_job",
        entity_id=job.id,
        metadata={"fileName": job.file_name, "totalRows": job.total_rows},
    )
    return job


async def commit_import(session: AsyncSession, user: User, job: ImportJob) -> tuple[int, int]:
    if job.status is ImportJobStatus.COMMITTED:
        raise RuntimeError("This import job has already been committed.")
    if job.status is not ImportJobStatus.READY or job.invalid_rows:
        raise ValueError("Correct all import errors before committing the job.")
    created_customers = 0
    created_interactions = 0
    for row in job.rows_json:
        customer = Customer(
            company_name=str(row["company_name"]),
            contact_name=str(row["contact_name"]),
            email=row.get("email") or None,
            phone=row.get("phone") or None,
            owner_id=user.id,
        )
        session.add(customer)
        await session.flush()
        created_customers += 1
        sku = row.get("product_sku")
        if sku:
            product = await session.scalar(select(Product).where(Product.sku == sku))
            if product is None:
                product = Product(sku=sku, name=sku)
                session.add(product)
                await session.flush()
            session.add(
                CustomerInterest(
                    customer_id=customer.id,
                    product_id=product.id,
                    interest_level=InterestLevel(
                        row.get("interest_level") or InterestLevel.MEDIUM.value
                    ),
                )
            )
        interaction_type = row.get("interaction_type")
        if interaction_type and row.get("interaction_summary"):
            session.add(
                CustomerInteraction(
                    customer_id=customer.id,
                    user_id=user.id,
                    type=InteractionType(interaction_type),
                    summary=str(row["interaction_summary"]),
                    occurred_at=_parse_date(str(row.get("interaction_date"))),
                )
            )
            created_interactions += 1
    job.status = ImportJobStatus.COMMITTED
    job.completed_at = datetime.now(UTC)
    await record_audit(
        session,
        actor_id=user.id,
        action="import.committed",
        entity_type="import_job",
        entity_id=job.id,
        metadata={
            "createdCustomers": created_customers,
            "createdInteractions": created_interactions,
        },
    )
    return created_customers, created_interactions
