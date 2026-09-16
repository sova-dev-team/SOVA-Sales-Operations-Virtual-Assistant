import pytest
from app.core.config import Settings
from app.core.database import create_database_engine, create_session_factory


@pytest.mark.asyncio
async def test_database_engine_uses_configured_connection_url() -> None:
    settings = Settings(database_url="postgresql+asyncpg://user:password@db.example.test:5432/app")
    database_engine = create_database_engine(settings)

    assert str(database_engine.url) == ("postgresql+asyncpg://user:***@db.example.test:5432/app")
    assert database_engine.echo is True

    await database_engine.dispose()


@pytest.mark.asyncio
async def test_session_factory_does_not_expire_objects_after_commit() -> None:
    settings = Settings(database_url="postgresql+asyncpg://user:password@localhost:5432/app")
    database_engine = create_database_engine(settings)
    factory = create_session_factory(database_engine)

    assert factory.kw.get("expire_on_commit") is False
    assert factory.kw.get("autoflush") is False

    await database_engine.dispose()
