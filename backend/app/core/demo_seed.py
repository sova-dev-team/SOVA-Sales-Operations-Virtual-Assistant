from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import PasswordHasher
from app.models import Customer, CustomerInteraction, CustomerInterest, Product, User
from app.models.entities import InteractionType, InterestLevel, UserRole

DEMO_ADMIN_EMAIL = "admin.demo@example.test"
DEMO_STAFF_EMAIL = "staff.demo@example.test"
DEMO_PASSWORD = "DemoPass123!"


async def seed_demo_data(session: AsyncSession) -> None:
    hasher = PasswordHasher()
    users: dict[str, User] = {}
    for email, full_name, role in (
        (DEMO_ADMIN_EMAIL, "Demo Admin", UserRole.ADMIN),
        (DEMO_STAFF_EMAIL, "Demo Staff", UserRole.STAFF),
    ):
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                full_name=full_name,
                password_hash=hasher.hash(DEMO_PASSWORD),
                role=role,
            )
            session.add(user)
            await session.flush()
        users[email] = user

    products: dict[str, Product] = {}
    for sku, name in (
        ("PKG-001", "Standard Operations Package"),
        ("PKG-002", "Analytics Package"),
        ("PKG-003", "Implementation Support"),
    ):
        product = await session.scalar(select(Product).where(Product.sku == sku))
        if product is None:
            product = Product(sku=sku, name=name)
            session.add(product)
            await session.flush()
        products[sku] = product

    customer_specs = (
        ("Delta Mekong Manufacturing", "Nguyen Minh Anh", "minh.anh@delta-example.test", "PKG-001"),
        ("Lotus North Trading", "Tran Bao Long", "bao.long@lotus-example.test", "PKG-002"),
        ("Sunrise Components", "Le Ha My", "ha.my@sunrise-example.test", "PKG-001"),
    )
    staff = users[DEMO_STAFF_EMAIL]
    for company_name, contact_name, email, sku in customer_specs:
        customer = await session.scalar(select(Customer).where(Customer.email == email))
        if customer is None:
            customer = Customer(
                company_name=company_name,
                contact_name=contact_name,
                email=email,
                owner_id=staff.id,
            )
            session.add(customer)
            await session.flush()
        interest = await session.scalar(
            select(CustomerInterest).where(
                CustomerInterest.customer_id == customer.id,
                CustomerInterest.product_id == products[sku].id,
            )
        )
        if interest is None:
            session.add(
                CustomerInterest(
                    customer_id=customer.id,
                    product_id=products[sku].id,
                    interest_level=InterestLevel.HIGH,
                )
            )
        interaction = await session.scalar(
            select(CustomerInteraction).where(CustomerInteraction.customer_id == customer.id)
        )
        if interaction is None:
            session.add(
                CustomerInteraction(
                    customer_id=customer.id,
                    user_id=staff.id,
                    type=InteractionType.MEETING,
                    summary="Synthetic demo interaction for portfolio walkthrough.",
                    occurred_at=datetime.now(UTC) - timedelta(days=2),
                )
            )
