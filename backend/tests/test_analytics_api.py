from datetime import UTC, datetime, timedelta

import httpx
import pytest
from app.api.dependencies import get_db_session
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.main import create_app
from app.models import CustomerInterest, Product, User
from app.models.entities import InterestLevel, UserRole
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _staff(factory: async_sessionmaker[AsyncSession]) -> User:
    async with factory() as session:
        user = User(
            email="analyst@example.com",
            full_name="Analyst",
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
async def test_overview_and_interaction_trend_are_scoped_to_staff(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await _staff(session_factory)
    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)
    now = datetime.now(UTC)
    start = (now - timedelta(days=2)).isoformat()
    end = (now + timedelta(days=1)).isoformat()

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "analyst@example.com", "password": "password-123"},
        )
        token = login.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}
        customer = await client.post(
            "/api/v1/customers",
            headers=headers,
            json={"companyName": "Analytics Co", "contactName": "Analyst Customer"},
        )
        customer_id = customer.json()["id"]
        occurred_at = (now - timedelta(hours=2)).isoformat()
        await client.post(
            f"/api/v1/customers/{customer_id}/interactions",
            headers=headers,
            json={"type": "meeting", "summary": "Met", "occurredAt": occurred_at},
        )
        overview = await client.get(
            "/api/v1/analytics/overview", params={"start": start, "end": end}, headers=headers
        )
        trend = await client.get(
            "/api/v1/analytics/interactions-trend",
            params={"start": start, "end": end},
            headers=headers,
        )

    assert overview.status_code == 200
    assert overview.json()["totalCustomers"] == 1
    assert overview.json()["interactions"] == 1
    assert overview.json()["activeCustomers"] == 1
    assert trend.status_code == 200
    assert sum(point["count"] for point in trend.json()["points"]) == 1


@pytest.mark.asyncio
async def test_customers_by_product_counts_visible_interests(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    staff = await _staff(session_factory)
    async with session_factory() as session:
        product = Product(sku="PKG-ANALYTICS", name="Analytics Package")
        session.add(product)
        await session.flush()
        from app.models import Customer

        customer = Customer(
            company_name="Product Co", contact_name="Product Buyer", owner_id=staff.id
        )
        session.add(customer)
        await session.flush()
        session.add(
            CustomerInterest(
                customer_id=customer.id,
                product_id=product.id,
                interest_level=InterestLevel.HIGH,
            )
        )
        await session.commit()

    application = _app(session_factory)
    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "analyst@example.com", "password": "password-123"},
        )
        response = await client.get(
            "/api/v1/analytics/customers-by-product",
            headers={"Authorization": f"Bearer {login.json()['accessToken']}"},
        )

    assert response.status_code == 200
    assert response.json()[0]["productSku"] == "PKG-ANALYTICS"
    assert response.json()[0]["customerCount"] == 1
