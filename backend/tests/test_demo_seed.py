from app.core.demo_seed import DEMO_ADMIN_EMAIL, DEMO_STAFF_EMAIL, seed_demo_data
from app.models import Customer, Product, User
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def test_demo_seed_is_synthetic_and_idempotent(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        await seed_demo_data(session)
        await session.commit()
        await seed_demo_data(session)
        await session.commit()

        assert await session.scalar(select(func.count()).select_from(User)) == 2
        assert await session.scalar(select(func.count()).select_from(Product)) == 3
        assert await session.scalar(select(func.count()).select_from(Customer)) == 3
        assert (
            await session.scalar(select(User.email).where(User.email == DEMO_ADMIN_EMAIL))
            == DEMO_ADMIN_EMAIL
        )
        assert (
            await session.scalar(select(User.email).where(User.email == DEMO_STAFF_EMAIL))
            == DEMO_STAFF_EMAIL
        )
