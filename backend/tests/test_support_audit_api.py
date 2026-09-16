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
    return response.json()["accessToken"]


@pytest.mark.asyncio
async def test_staff_ticket_lifecycle_and_admin_audit_view(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _user(session_factory, "ticket-staff@example.com", UserRole.STAFF)
    await _user(session_factory, "ticket-admin@example.com", UserRole.ADMIN)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        staff_headers = {
            "Authorization": f"Bearer {await _token(client, 'ticket-staff@example.com')}"
        }
        admin_headers = {
            "Authorization": f"Bearer {await _token(client, 'ticket-admin@example.com')}"
        }
        created = await client.post(
            "/api/v1/support-tickets",
            headers=staff_headers,
            json={
                "title": "VPN access",
                "description": "Cannot connect from office.",
                "category": "access",
                "priority": "high",
            },
        )
        assert created.status_code == 201
        ticket_id = created.json()["id"]
        comment = await client.post(
            f"/api/v1/support-tickets/{ticket_id}/comments",
            headers=staff_headers,
            json={"body": "Still blocked after restart."},
        )
        assert comment.status_code == 201
        updated = await client.patch(
            f"/api/v1/support-tickets/{ticket_id}",
            headers=admin_headers,
            json={"status": "in_progress"},
        )
        assert updated.status_code == 200
        detail = await client.get(f"/api/v1/support-tickets/{ticket_id}", headers=staff_headers)
        logs = await client.get("/api/v1/audit-logs", headers=admin_headers)

    assert detail.status_code == 200
    assert len(detail.json()["comments"]) == 1
    assert logs.status_code == 200
    assert logs.json()["meta"]["total"] >= 3


@pytest.mark.asyncio
async def test_staff_cannot_assign_ticket_or_view_other_staff_ticket(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _user(session_factory, "first-ticket@example.com", UserRole.STAFF)
    second = await _user(session_factory, "second-ticket@example.com", UserRole.STAFF)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        first_headers = {
            "Authorization": f"Bearer {await _token(client, 'first-ticket@example.com')}"
        }
        second_headers = {
            "Authorization": f"Bearer {await _token(client, 'second-ticket@example.com')}"
        }
        created = await client.post(
            "/api/v1/support-tickets",
            headers=first_headers,
            json={
                "title": "Private ticket",
                "description": "Private",
                "category": "software",
            },
        )
        ticket_id = created.json()["id"]
        forbidden = await client.patch(
            f"/api/v1/support-tickets/{ticket_id}",
            headers=first_headers,
            json={"assigneeId": str(second.id)},
        )
        hidden = await client.get(f"/api/v1/support-tickets/{ticket_id}", headers=second_headers)

    assert forbidden.status_code == 403
    assert hidden.status_code == 404
