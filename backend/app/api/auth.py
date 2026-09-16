from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.api.dependencies import CurrentUser, DbSession, SettingsDependency
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenPairResponse,
    UserResponse,
)
from app.services.audit import record_audit
from app.services.auth import (
    TokenPair,
    authenticate_user,
    issue_token_pair,
    revoke_refresh_token,
    rotate_refresh_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _token_response(pair: TokenPair) -> TokenPairResponse:
    return TokenPairResponse(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        expires_in=pair.expires_in,
    )


@router.post("/login", response_model=TokenPairResponse)
async def login(
    payload: LoginRequest,
    session: DbSession,
    settings: SettingsDependency,
) -> TokenPairResponse:
    user = await authenticate_user(session, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    pair = await issue_token_pair(settings, session, user)
    await record_audit(
        session,
        actor_id=user.id,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
    )
    await session.commit()
    return _token_response(pair)


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    payload: RefreshRequest,
    session: DbSession,
    settings: SettingsDependency,
) -> TokenPairResponse:
    try:
        pair = await rotate_refresh_token(settings, session, payload.refresh_token)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    await session.commit()
    return _token_response(pair)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    session: DbSession,
    settings: SettingsDependency,
) -> Response:
    await revoke_refresh_token(settings, session, payload.refresh_token)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> User:
    return current_user
