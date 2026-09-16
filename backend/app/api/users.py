from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import AdminUser, DbSession
from app.core.security import PasswordHasher
from app.models import User
from app.schemas.auth import UserCreateRequest, UserResponse, UserUpdateRequest
from app.schemas.common import PageMeta, PageResponse
from app.services.audit import record_audit

router = APIRouter(prefix="/api/v1/users", tags=["users"])
_password_hasher = PasswordHasher()


@router.get("", response_model=PageResponse[UserResponse])
async def list_users(
    _admin: AdminUser,
    session: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PageResponse[UserResponse]:
    total = int(await session.scalar(select(func.count()).select_from(User)) or 0)
    users = list(
        (
            await session.scalars(
                select(User)
                .order_by(User.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
    )
    return PageResponse(
        items=[UserResponse.model_validate(user) for user in users],
        meta=PageMeta.from_total(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    admin: AdminUser,
    session: DbSession,
) -> User:
    user = User(
        email=payload.email,
        full_name=payload.full_name.strip(),
        password_hash=_password_hasher.hash(payload.password),
        role=payload.role,
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="A user with this email already exists."
        ) from error
    await record_audit(
        session,
        actor_id=admin.id,
        action="user.created",
        entity_type="user",
        entity_id=user.id,
        metadata={"role": user.role.value},
    )
    await session.commit()
    await session.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, _admin: AdminUser, session: DbSession) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    admin: AdminUser,
    session: DbSession,
) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "full_name" in changes and changes["full_name"] is not None:
        user.full_name = str(changes["full_name"]).strip()
    if "role" in changes and changes["role"] is not None:
        user.role = changes["role"]
    if "is_active" in changes and changes["is_active"] is not None:
        user.is_active = bool(changes["is_active"])
    if "password" in changes and changes["password"] is not None:
        user.password_hash = _password_hasher.hash(str(changes["password"]))
    await record_audit(
        session,
        actor_id=admin.id,
        action="user.updated",
        entity_type="user",
        entity_id=user.id,
        metadata={"fields": list(changes)},
    )
    await session.commit()
    await session.refresh(user)
    return user
