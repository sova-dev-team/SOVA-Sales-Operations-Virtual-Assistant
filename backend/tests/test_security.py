from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from app.core.config import Settings
from app.core.security import PasswordHasher, TokenType, decode_token, encode_token


def test_password_hasher_round_trip_and_rejects_wrong_password() -> None:
    hasher = PasswordHasher()
    password_hash = hasher.hash("correct horse battery staple")

    assert password_hash != "correct horse battery staple"
    assert hasher.verify("correct horse battery staple", password_hash)
    assert not hasher.verify("wrong password", password_hash)


def test_token_round_trip_exposes_subject_and_type() -> None:
    settings = Settings(jwt_secret="test-secret-which-is-long-enough-123456")
    subject = uuid4()

    token = encode_token(settings, subject, TokenType.ACCESS, timedelta(minutes=5))
    claims = decode_token(settings, token, TokenType.ACCESS)

    assert claims.subject == subject
    assert claims.token_type is TokenType.ACCESS
    assert claims.expires_at > datetime.now(UTC)


def test_decode_token_rejects_wrong_type_and_expired_token() -> None:
    settings = Settings(jwt_secret="test-secret-which-is-long-enough-123456")
    refresh = encode_token(settings, uuid4(), TokenType.REFRESH, timedelta(minutes=5))

    with pytest.raises(ValueError, match="Invalid token"):
        decode_token(settings, refresh, TokenType.ACCESS)

    expired = encode_token(settings, uuid4(), TokenType.ACCESS, timedelta(seconds=-1))
    with pytest.raises(ValueError, match="Invalid token"):
        decode_token(settings, expired, TokenType.ACCESS)
