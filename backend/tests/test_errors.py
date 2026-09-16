import httpx
import pytest
from app.main import create_app


@pytest.mark.asyncio
async def test_unknown_route_returns_problem_details() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/route-that-does-not-exist")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.headers["x-request-id"]
    assert response.json() == {
        "type": "https://api.example.com/problems/not-found",
        "title": "Resource not found",
        "status": 404,
        "detail": "The requested resource was not found.",
        "code": "NOT_FOUND",
        "requestId": response.headers["x-request-id"],
    }
