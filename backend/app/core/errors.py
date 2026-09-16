from collections.abc import Mapping
from typing import Any
from uuid import uuid4

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

_STATUS_DEFAULTS: dict[int, tuple[str, str, str]] = {
    400: (
        "Bad request",
        "The request could not be understood.",
        "BAD_REQUEST",
    ),
    401: (
        "Authentication required",
        "Authentication is required to access this resource.",
        "UNAUTHENTICATED",
    ),
    403: (
        "Permission denied",
        "You do not have permission to access this resource.",
        "FORBIDDEN",
    ),
    404: (
        "Resource not found",
        "The requested resource was not found.",
        "NOT_FOUND",
    ),
    409: (
        "Resource conflict",
        "The request conflicts with the current resource state.",
        "CONFLICT",
    ),
    413: (
        "Payload too large",
        "The submitted payload is too large.",
        "PAYLOAD_TOO_LARGE",
    ),
    422: (
        "Validation failed",
        "One or more fields are invalid.",
        "VALIDATION_ERROR",
    ),
    429: (
        "Too many requests",
        "Too many requests were received. Try again later.",
        "RATE_LIMITED",
    ),
    503: (
        "Dependency unavailable",
        "A required dependency is temporarily unavailable.",
        "DEPENDENCY_UNAVAILABLE",
    ),
}


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _problem_response(
    *,
    request: Request,
    status: int,
    title: str,
    detail: str,
    code: str,
    field_errors: Mapping[str, list[str]] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    payload: dict[str, Any] = {
        "type": f"https://api.example.com/problems/{code.lower().replace('_', '-')}",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        "requestId": _request_id(request),
    }
    if field_errors:
        payload["fieldErrors"] = dict(field_errors)

    response_headers = dict(headers or {})
    response_headers["X-Request-ID"] = payload["requestId"]
    return JSONResponse(
        status_code=status,
        content=payload,
        headers=response_headers,
        media_type="application/problem+json",
    )


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, HTTPException):
        raise TypeError("http_exception_handler received an unsupported exception")

    title, default_detail, code = _STATUS_DEFAULTS.get(
        exc.status_code,
        ("Request failed", "The request could not be completed.", "REQUEST_FAILED"),
    )
    detail = (
        default_detail if exc.status_code == 404 or not isinstance(exc.detail, str) else exc.detail
    )
    return _problem_response(
        request=request,
        status=exc.status_code,
        title=title,
        detail=detail,
        code=code,
        headers=exc.headers,
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise TypeError("validation_exception_handler received an unsupported exception")

    field_errors: dict[str, list[str]] = {}
    for error in exc.errors():
        location = [str(part) for part in error.get("loc", ()) if part not in {"body", "query"}]
        field = ".".join(location) or "request"
        field_errors.setdefault(field, []).append(str(error.get("msg", "Invalid value")))

    return _problem_response(
        request=request,
        status=422,
        title="Validation failed",
        detail="One or more fields are invalid.",
        code="VALIDATION_ERROR",
        field_errors=field_errors,
    )
