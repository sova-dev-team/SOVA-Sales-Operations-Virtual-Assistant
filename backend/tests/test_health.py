import logging
from uuid import UUID

import httpx
import pytest
from app.main import create_app


@pytest.mark.asyncio
async def test_health_returns_public_service_status() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-sales-operations-api",
        "version": "0.1.0",
    }


@pytest.mark.asyncio
async def test_request_id_is_preserved_and_logged(caplog) -> None:
    caplog.set_level(logging.INFO, logger="app.http")
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health", headers={"X-Request-ID": "request-123"})

    assert response.headers["x-request-id"] == "request-123"
    assert any(
        "http_request" in record.message and "request-123" in record.message
        for record in caplog.records
    )


@pytest.mark.asyncio
async def test_oversized_request_id_is_replaced() -> None:
    transport = httpx.ASGITransport(app=create_app())
    oversized_request_id = "x" * 129

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health", headers={"X-Request-ID": oversized_request_id})

    resolved_request_id = response.headers["x-request-id"]
    assert resolved_request_id != oversized_request_id
    UUID(resolved_request_id)


@pytest.mark.asyncio
async def test_cors_allows_configured_frontend_origin() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
