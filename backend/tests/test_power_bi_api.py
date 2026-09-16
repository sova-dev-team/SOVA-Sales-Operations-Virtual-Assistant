import httpx
import pytest
from app.api.dependencies import get_db_session
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.main import create_app
from app.models import User
from app.models.entities import UserRole
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _admin(factory: async_sessionmaker[AsyncSession]) -> User:
    async with factory() as session:
        user = User(
            email="powerbi-admin@example.com",
            full_name="Power BI Admin",
            password_hash=PasswordHasher().hash("password-123"),
            role=UserRole.ADMIN,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


def _app(factory: async_sessionmaker[AsyncSession], enabled: bool):
    settings = Settings(
        jwt_secret="test-secret-which-is-long-enough-123456",
        power_bi_enabled=enabled,
        power_bi_report_id="synthetic-report-001",
    )
    application = create_app(settings)

    async def override_session():
        async with factory() as session:
            yield session

    application.dependency_overrides[get_db_session] = override_session
    return application


@pytest.mark.asyncio
async def test_power_bi_embed_config_is_short_lived_and_secret_free(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _admin(session_factory)
    application = _app(session_factory, enabled=True)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "powerbi-admin@example.com", "password": "password-123"},
        )
        headers = {"Authorization": f"Bearer {login.json()['accessToken']}"}
        reports = await client.get("/api/v1/power-bi/reports", headers=headers)
        config = await client.post("/api/v1/power-bi/embed-config", headers=headers)

    assert reports.status_code == 200
    assert reports.json()[0]["isAvailable"] is True
    assert config.status_code == 200
    assert config.json()["reportId"] == "synthetic-report-001"
    assert "client_secret" not in config.text
    assert "power_bi_client_secret" not in config.text


@pytest.mark.asyncio
async def test_power_bi_disabled_returns_fallback_status(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _admin(session_factory)
    application = _app(session_factory, enabled=False)
    transport = httpx.ASGITransport(app=application)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "powerbi-admin@example.com", "password": "password-123"},
        )
        token = login.json()["accessToken"]
        config = await client.post(
            "/api/v1/power-bi/embed-config",
            headers={"Authorization": f"Bearer {token}"},
        )
        refresh = await client.get(
            "/api/v1/power-bi/refresh-status",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert config.status_code == 503
    assert refresh.status_code == 200
    assert refresh.json()["status"] == "unavailable"
