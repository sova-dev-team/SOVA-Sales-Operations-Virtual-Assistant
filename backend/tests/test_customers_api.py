from datetime import UTC, datetime

import httpx
import pytest
from app.api.dependencies import get_db_session
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.main import create_app
from app.models import User
from app.models.entities import UserRole
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _user(factory: async_sessionmaker[AsyncSession], email: str, role: UserRole) -> User:
    async with factory() as session:
        user = User(
            email=email,
            full_name=email.split("@")[0],
            password_hash=PasswordHasher().hash("password-123"),
            role=role,
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


async def _token(client: httpx.AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password-123"}
    )
    assert response.status_code == 200
    return response.json()["accessToken"]


@pytest.mark.asyncio
async def test_staff_can_create_customer_and_record_interaction(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _user(session_factory, "staff@example.com", UserRole.STAFF)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _token(client, "staff@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        created = await client.post(
            "/api/v1/customers",
            headers=headers,
            json={
                "companyName": "Delta Co",
                "contactName": "Lan Nguyen",
                "email": "LAN@EXAMPLE.COM",
                "phone": "0900000000",
            },
        )
        assert created.status_code == 201
        customer = created.json()
        assert customer["email"] == "lan@example.com"

        interaction = await client.post(
            f"/api/v1/customers/{customer['id']}/interactions",
            headers=headers,
            json={
                "type": "call",
                "summary": "Discussed renewal timeline",
                "occurredAt": datetime.now(UTC).isoformat(),
            },
        )
        assert interaction.status_code == 201
        assert interaction.json()["customerId"] == customer["id"]

        listing = await client.get("/api/v1/customers", headers=headers)
        assert listing.status_code == 200
        assert listing.json()["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_staff_cannot_access_another_staff_customer(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _user(session_factory, "one@example.com", UserRole.STAFF)
    second = await _user(session_factory, "two@example.com", UserRole.STAFF)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        first_token = await _token(client, "one@example.com")
        second_token = await _token(client, "two@example.com")
        created = await client.post(
            "/api/v1/customers",
            headers={"Authorization": f"Bearer {first_token}"},
            json={"companyName": "Private Co", "contactName": "Owner"},
        )
        customer_id = created.json()["id"]
        hidden = await client.get(
            f"/api/v1/customers/{customer_id}",
            headers={"Authorization": f"Bearer {second_token}"},
        )

    assert second.id
    assert hidden.status_code == 404


@pytest.mark.asyncio
async def test_follow_up_endpoint_returns_stale_customer(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _user(session_factory, "staff@example.com", UserRole.STAFF)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _token(client, "staff@example.com")
        created = await client.post(
            "/api/v1/customers",
            headers={"Authorization": f"Bearer {token}"},
            json={"companyName": "Follow Up Co", "contactName": "Stale"},
        )
        assert created.status_code == 201
        follow_ups = await client.get(
            "/api/v1/customers/follow-ups",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert follow_ups.status_code == 200
    assert len(follow_ups.json()) == 1
    assert follow_ups.json()[0]["customer"]["companyName"] == "Follow Up Co"
