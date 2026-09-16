from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import (
    PasswordHasher,
    TokenClaims,
    TokenType,
    decode_token,
    encode_token,
    hash_token,
)
from app.models import RefreshSession, User


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int


_password_hasher = PasswordHasher()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    user = await session.scalar(
        select(User).where(
            User.email == normalize_email(email),
            User.is_active.is_(True),
        )
    )
    if user is None or not _password_hasher.verify(password, user.password_hash):
        return None
    return user


async def issue_token_pair(settings: Settings, session: AsyncSession, user: User) -> TokenPair:
    access_lifetime = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_lifetime = timedelta(days=settings.refresh_token_expire_days)
    access_token = encode_token(settings, user.id, TokenType.ACCESS, access_lifetime)
    refresh_token = encode_token(settings, user.id, TokenType.REFRESH, refresh_lifetime)
    expires_at = datetime.now(UTC) + refresh_lifetime
    session.add(
        RefreshSession(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=expires_at,
        )
    )
    await session.flush()
    return TokenPair(access_token, refresh_token, int(access_lifetime.total_seconds()))


async def rotate_refresh_token(
    settings: Settings, session: AsyncSession, refresh_token: str
) -> TokenPair:
    claims = _decode_refresh(settings, refresh_token)
    refresh_session = await session.scalar(
        select(RefreshSession).where(RefreshSession.token_hash == hash_token(refresh_token))
    )
    now = datetime.now(UTC)
    if (
        refresh_session is None
        or refresh_session.revoked_at is not None
        or _as_utc(refresh_session.expires_at) <= now
        or refresh_session.user_id != claims.subject
    ):
        raise ValueError("Invalid refresh token")
    user = await session.get(User, claims.subject)
    if user is None or not user.is_active:
        raise ValueError("Invalid refresh token")
    refresh_session.revoked_at = now
    return await issue_token_pair(settings, session, user)


async def revoke_refresh_token(settings: Settings, session: AsyncSession, token: str) -> bool:
    try:
        _decode_refresh(settings, token)
    except ValueError:
        return False
    refresh_session = await session.scalar(
        select(RefreshSession).where(RefreshSession.token_hash == hash_token(token))
    )
    if refresh_session is None or refresh_session.revoked_at is not None:
        return False
    refresh_session.revoked_at = datetime.now(UTC)
    await session.flush()
    return True


def _decode_refresh(settings: Settings, token: str) -> TokenClaims:
    try:
        return decode_token(settings, token, TokenType.REFRESH)
    except ValueError as error:
        raise ValueError("Invalid refresh token") from error
