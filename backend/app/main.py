import logging
from collections.abc import Awaitable, Callable
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.analytics import router as analytics_router
from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.customers import router as customers_router
from app.api.email_drafts import router as email_drafts_router
from app.api.health import router as health_router
from app.api.imports import router as imports_router
from app.api.power_bi import router as power_bi_router
from app.api.support import router as support_router
from app.api.users import router as users_router
from app.core.config import Settings, get_settings
from app.core.errors import http_exception_handler, validation_exception_handler

http_logger = logging.getLogger("app.http")
_MAX_REQUEST_ID_LENGTH = 128


def _resolve_request_id(header_value: str | None) -> str:
    if (
        header_value
        and len(header_value) <= _MAX_REQUEST_ID_LENGTH
        and all(0x20 <= ord(character) <= 0x7E for character in header_value)
    ):
        return header_value
    return str(uuid4())


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    application = FastAPI(
        title="AI Sales and Operations Assistant API",
        version=resolved_settings.app_version,
        description=(
            "Internal API for customer operations, analytics, and AI-assisted email drafts."
        ),
    )

    application.dependency_overrides[get_settings] = lambda: resolved_settings
    application.add_exception_handler(StarletteHTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)

    @application.middleware("http")
    async def add_request_id(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        started_at = perf_counter()
        request_id = _resolve_request_id(request.headers.get("X-Request-ID"))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        http_logger.info(
            "http_request method=%s path=%s status=%s duration_ms=%.2f request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            (perf_counter() - started_at) * 1000,
            request_id,
        )
        return response

    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(analytics_router)
    application.include_router(users_router)
    application.include_router(customers_router)
    application.include_router(email_drafts_router)
    application.include_router(imports_router)
    application.include_router(power_bi_router)
    application.include_router(support_router)
    application.include_router(audit_router)
    return application


app = create_app()
