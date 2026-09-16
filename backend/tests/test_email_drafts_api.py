import httpx
import pytest
from app.api.dependencies import get_db_session
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.main import create_app
from app.models import User
from app.models.entities import UserRole
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _staff(factory: async_sessionmaker[AsyncSession]) -> User:
    async with factory() as session:
        user = User(
            email="writer@example.com",
            full_name="Writer",
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


@pytest.mark.asyncio
async def test_email_draft_requires_human_review_before_approval(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _staff(session_factory)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "writer@example.com", "password": "password-123"},
        )
        token = login.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}
        customer = await client.post(
            "/api/v1/customers",
            headers=headers,
            json={"companyName": "Draft Co", "contactName": "Draft Contact"},
        )
        draft = await client.post(
            "/api/v1/email-drafts/generate",
            headers=headers,
            json={
                "customerId": customer.json()["id"],
                "purpose": "followUp",
                "language": "vi",
                "tone": "professional",
            },
        )
        assert draft.status_code == 201
        draft_id = draft.json()["id"]
        assert draft.json()["status"] == "draft"
        assert "Draft Co" in draft.json()["subject"]

        not_ready = await client.post(f"/api/v1/email-drafts/{draft_id}/approve", headers=headers)
        assert not_ready.status_code == 409

        reviewed = await client.post(
            f"/api/v1/email-drafts/{draft_id}/review",
            headers=headers,
            json={"body": "Edited by a human reviewer."},
        )
        assert reviewed.status_code == 200
        assert reviewed.json()["status"] == "reviewed"
        approved = await client.post(f"/api/v1/email-drafts/{draft_id}/approve", headers=headers)

    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"


@pytest.mark.asyncio
async def test_staff_cannot_generate_for_unowned_customer(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _staff(session_factory)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "writer@example.com", "password": "password-123"},
        )
        token = login.json()["accessToken"]
        response = await client.post(
            "/api/v1/email-drafts/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "customerId": "00000000-0000-0000-0000-000000000001",
                "purpose": "followUp",
                "language": "en",
                "tone": "concise",
            },
        )

    assert response.status_code == 404
