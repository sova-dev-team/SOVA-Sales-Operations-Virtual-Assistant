from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.models.entities import UserRole
from app.schemas.base import APIModel


class LoginRequest(APIModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Enter a valid email address.")
        return normalized


class RefreshRequest(APIModel):
    refresh_token: str = Field(min_length=32, max_length=4096)


class LogoutRequest(RefreshRequest):
    pass


class TokenPairResponse(APIModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(APIModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreateRequest(APIModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8, max_length=256)
    role: UserRole = UserRole.STAFF

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Enter a valid email address.")
        return normalized


class UserUpdateRequest(APIModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=256)
