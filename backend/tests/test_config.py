import httpx
import pytest
from app.core.config import Settings
from app.main import create_app


def test_settings_can_be_overridden_for_another_environment(monkeypatch) -> None:
    monkeypatch.setenv("SERVICE_NAME", "test-api")
    monkeypatch.setenv("ENVIRONMENT", "test")

    settings = Settings()

    assert settings.service_name == "test-api"
    assert settings.environment == "test"


@pytest.mark.asyncio
async def test_health_uses_explicit_application_settings() -> None:
    transport = httpx.ASGITransport(
        app=create_app(Settings(service_name="contract-test", app_version="9.9.9"))
    )
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.json() == {
        "status": "ok",
        "service": "contract-test",
        "version": "9.9.9",
    }
