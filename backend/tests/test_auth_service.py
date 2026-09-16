from datetime import UTC, datetime

import pytest
from app.core.config import Settings
from app.core.security import PasswordHasher
from app.models import RefreshSession, User
from app.models.entities import UserRole
from app.services.auth import (
    authenticate_user,
    issue_token_pair,
    revoke_refresh_token,
    rotate_refresh_token,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def _create_user(factory: async_sessionmaker[AsyncSession]) -> User:
    async with factory() as session:
        user = User(
            email="staff@example.com",
            full_name="Demo Staff",
            password_hash=PasswordHasher().hash("password-123"),
            role=UserRole.STAFF,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def test_authenticate_user_requires_active_user_and_valid_password(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user = await _create_user(session_factory)

    async with session_factory() as session:
        assert (await authenticate_user(session, "STAFF@example.com", "password-123")) is not None
        assert (await authenticate_user(session, user.email, "wrong-password")) is None

        stored_user = await session.get(User, user.id)
        assert stored_user is not None
        stored_user.is_active = False
        await session.commit()
        assert (await authenticate_user(session, user.email, "password-123")) is None


@pytest.mark.asyncio
async def test_refresh_rotation_revokes_old_session(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    settings = Settings(jwt_secret="test-secret-which-is-long-enough-123456")
    user = await _create_user(session_factory)

    async with session_factory() as session:
        pair = await issue_token_pair(settings, session, user)
        await session.commit()
        rotated = await rotate_refresh_token(settings, session, pair.refresh_token)
        await session.commit()

        assert rotated.access_token != pair.access_token
        sessions = list((await session.scalars(select(RefreshSession))).all())
        assert len(sessions) == 2
        assert sum(item.revoked_at is not None for item in sessions) == 1

        with pytest.raises(ValueError, match="Invalid refresh token"):
            await rotate_refresh_token(settings, session, pair.refresh_token)


async def test_logout_is_idempotent_for_unknown_refresh_token(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    settings = Settings(jwt_secret="test-secret-which-is-long-enough-123456")

    async with session_factory() as session:
        assert not await revoke_refresh_token(settings, session, "not-a-real-token")

    assert datetime.now(UTC).tzinfo is not None
