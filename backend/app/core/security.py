import base64
import hashlib
import hmac
import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

import jwt
from jwt import InvalidTokenError

from app.core.config import Settings


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


@dataclass(frozen=True)
class TokenClaims:
    subject: UUID
    token_type: TokenType
    token_id: UUID
    expires_at: datetime


class PasswordHasher:
    _algorithm = "scrypt"
    _n = 2**14
    _r = 8
    _p = 1
    _salt_bytes = 16

    def hash(self, password: str) -> str:
        salt = os.urandom(self._salt_bytes)
        digest = hashlib.scrypt(
            password.encode("utf-8"), salt=salt, n=self._n, r=self._r, p=self._p
        )
        encode = base64.urlsafe_b64encode
        return "$".join(
            (
                self._algorithm,
                str(self._n),
                str(self._r),
                str(self._p),
                encode(salt).decode("ascii"),
                encode(digest).decode("ascii"),
            )
        )

    def verify(self, password: str, encoded: str) -> bool:
        try:
            algorithm, n_value, r_value, p_value, salt_value, digest_value = encoded.split("$")
            if algorithm != self._algorithm:
                return False
            n = int(n_value)
            r = int(r_value)
            p = int(p_value)
            salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
            expected = base64.urlsafe_b64decode(digest_value.encode("ascii"))
            if (n, r, p) != (self._n, self._r, self._p) or len(salt) != self._salt_bytes:
                return False
            actual = hashlib.scrypt(
                password.encode("utf-8"),
                salt=salt,
                n=n,
                r=r,
                p=p,
                dklen=len(expected),
            )
        except (ValueError, TypeError, UnicodeError):
            return False
        return hmac.compare_digest(actual, expected)


def encode_token(
    settings: Settings,
    subject: UUID,
    token_type: TokenType,
    lifetime: timedelta,
) -> str:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + lifetime
    payload = {
        "sub": str(subject),
        "type": token_type.value,
        "jti": str(uuid4()),
        "iat": issued_at,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")


def decode_token(settings: Settings, token: str, expected_type: TokenType) -> TokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            options={"require": ["sub", "type", "jti", "exp"]},
        )
        if payload.get("type") != expected_type.value:
            raise ValueError("Unexpected token type")
        subject = UUID(str(payload["sub"]))
        token_id = UUID(str(payload["jti"]))
        expires_at = datetime.fromtimestamp(float(payload["exp"]), UTC)
    except (InvalidTokenError, KeyError, TypeError, ValueError, OverflowError) as error:
        raise ValueError("Invalid token") from error
    return TokenClaims(subject, expected_type, token_id, expires_at)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
