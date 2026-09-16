import asyncio

from app.core.database import session_factory
from app.core.demo_seed import seed_demo_data
from app.core.seed import run_seeders


async def main() -> None:
    await run_seeders(session_factory, [seed_demo_data])
    print("Synthetic demo data seeded successfully.")


if __name__ == "__main__":
    asyncio.run(main())
