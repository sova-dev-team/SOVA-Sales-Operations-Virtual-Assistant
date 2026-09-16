import httpx
import pytest
from app.api.dependencies import get_db_session
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.main import create_app
from app.models import User
from app.models.entities import UserRole
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _add_user(
    factory: async_sessionmaker[AsyncSession], *, email: str, role: UserRole
) -> User:
    async with factory() as session:
        user = User(
            email=email,
            full_name="Demo User",
            password_hash=PasswordHasher().hash("password-123"),
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


def _app_for(factory: async_sessionmaker[AsyncSession]):
    settings = Settings(jwt_secret="test-secret-which-is-long-enough-123456")
    application = create_app(settings)

    async def override_session():
        async with factory() as session:
            yield session

    application.dependency_overrides[get_db_session] = override_session
    return application


@pytest.mark.asyncio
async def test_login_me_and_protected_route(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _add_user(session_factory, email="admin@example.com", role=UserRole.ADMIN)
    application = _app_for(session_factory)

    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "ADMIN@example.com", "password": "password-123"},
        )
        assert login.status_code == 200
        tokens = login.json()
        assert tokens["tokenType"] == "bearer"

        me = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {tokens['accessToken']}"},
        )
        assert me.status_code == 200
        assert me.json()["email"] == "admin@example.com"

        users = await client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {tokens['accessToken']}"},
        )
        assert users.status_code == 200
        assert users.json()["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_staff_is_forbidden_from_admin_user_management(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _add_user(session_factory, email="staff@example.com", role=UserRole.STAFF)
    application = _app_for(session_factory)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "staff@example.com", "password": "password-123"},
        )
        token = login.json()["accessToken"]
        response = await client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_missing_authentication_uses_problem_contract(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    application = _app_for(session_factory)
    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "UNAUTHENTICATED"
