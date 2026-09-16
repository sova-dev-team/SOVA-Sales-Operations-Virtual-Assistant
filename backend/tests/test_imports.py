import io

import httpx
import pytest
from app.api.dependencies import get_db_session
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.main import create_app
from app.models import Customer, CustomerInteraction, CustomerInterest, User
from app.models.entities import UserRole
from app.services.imports import parse_customer_file
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _staff(factory: async_sessionmaker[AsyncSession]) -> User:
    async with factory() as session:
        user = User(
            email="importer@example.com",
            full_name="Importer",
            password_hash=PasswordHasher().hash("password-123"),
            role=UserRole.STAFF,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


def _app(factory: async_sessionmaker[AsyncSession]):
    application = create_app(Settings(jwt_secret="test-secret-which-is-long-enough-123456"))

    async def override_session():
        async with factory() as session:
            yield session

    application.dependency_overrides[get_db_session] = override_session
    return application


async def _token(client: httpx.AsyncClient) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "importer@example.com", "password": "password-123"},
    )
    return response.json()["accessToken"]


@pytest.mark.asyncio
async def test_csv_preview_reports_row_errors_and_blocks_commit(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _staff(session_factory)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)
    content = (
        b"company_name,contact_name,email\n"
        b"Valid Co,Ms Valid,valid@example.com\n"
        b"Broken Co,,broken@example.com\n"
    )

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _token(client)
        headers = {"Authorization": f"Bearer {token}"}
        preview = await client.post(
            "/api/v1/imports/customers/preview",
            headers=headers,
            files={"file": ("customers.csv", content, "text/csv")},
        )
        assert preview.status_code == 200
        assert preview.json()["job"]["status"] == "preview"
        assert preview.json()["job"]["validRows"] == 1
        assert preview.json()["errors"][0]["rowNumber"] == 3

        commit = await client.post(
            f"/api/v1/imports/{preview.json()['job']['id']}/commit", headers=headers
        )

    assert commit.status_code == 400


@pytest.mark.asyncio
async def test_valid_import_commits_customer_product_and_interaction(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _staff(session_factory)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)
    content = (
        b"company_name,contact_name,email,product_sku,interest_level,interaction_type,"
        b"interaction_summary,interaction_date\n"
        b"Valid Co,Ms Valid,valid@example.com,PKG-001,high,meeting,Discussed renewal,"
        b"2026-09-10\n"
    )

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _token(client)
        headers = {"Authorization": f"Bearer {token}"}
        preview = await client.post(
            "/api/v1/imports/customers/preview",
            headers=headers,
            files={"file": ("customers.csv", content, "text/csv")},
        )
        job_id = preview.json()["job"]["id"]
        commit = await client.post(f"/api/v1/imports/{job_id}/commit", headers=headers)

        assert commit.status_code == 200
        assert commit.json()["createdCustomerCount"] == 1
        assert commit.json()["createdInteractionCount"] == 1

        second_commit = await client.post(f"/api/v1/imports/{job_id}/commit", headers=headers)
        assert second_commit.status_code == 409

    async with session_factory() as session:
        assert len(list((await session.scalars(select(Customer))).all())) == 1
        assert len(list((await session.scalars(select(CustomerInterest))).all())) == 1
        assert len(list((await session.scalars(select(CustomerInteraction))).all())) == 1


@pytest.mark.asyncio
async def test_xlsx_parser_accepts_template_columns() -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["company_name", "contact_name", "email"])
    sheet.append(["XLSX Co", "XLSX Contact", "xlsx@example.com"])
    buffer = io.BytesIO()
    workbook.save(buffer)

    parsed = await parse_customer_file("customers.xlsx", buffer.getvalue())

    assert parsed.total_rows == 1
    assert parsed.errors == []
    assert parsed.rows[0]["company_name"] == "XLSX Co"


@pytest.mark.asyncio
async def test_import_parser_rejects_duplicate_headers_and_xlsx_extra_cells() -> None:
    with pytest.raises(ValueError, match="could not be read"):
        await parse_customer_file("duplicate.csv", b"company_name,company_name\nFirst,Second")

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["company_name", "contact_name"])
    sheet.append(["XLSX Co", "XLSX Contact", "unexpected cell"])
    buffer = io.BytesIO()
    workbook.save(buffer)

    with pytest.raises(ValueError, match="could not be read"):
        await parse_customer_file("extra-cell.xlsx", buffer.getvalue())
