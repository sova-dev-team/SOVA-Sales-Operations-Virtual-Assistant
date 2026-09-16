from collections.abc import Awaitable, Callable, Sequence

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

SeedStep = Callable[[AsyncSession], Awaitable[None]]


async def run_seeders(
    session_factory: async_sessionmaker[AsyncSession],
    seed_steps: Sequence[SeedStep],
) -> None:
    """Run ordered seed steps atomically in a single database transaction."""
    async with session_factory() as session, session.begin():
        for seed_step in seed_steps:
            await seed_step(session)
