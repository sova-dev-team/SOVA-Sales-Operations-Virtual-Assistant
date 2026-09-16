from functools import lru_cache
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_package_version() -> str:
    try:
        return package_version("ai-sales-operations-api")
    except PackageNotFoundError:
        return "0.1.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    service_name: str = "ai-sales-operations-api"
    app_version: str = Field(default_factory=_get_package_version)
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_sales_ops"
    jwt_secret: SecretStr = SecretStr(
        "development-only-change-this-secret-before-deployment-0000000000000000"
    )
    access_token_expire_minutes: int = Field(default=30, ge=5, le=1440)
    refresh_token_expire_days: int = Field(default=7, ge=1, le=90)
    follow_up_interval_days: int = Field(default=7, ge=1, le=365)
    power_bi_enabled: bool = False
    power_bi_workspace_id: str | None = None
    power_bi_report_id: str | None = None
    power_bi_tenant_id: str | None = None
    power_bi_client_id: str | None = None
    power_bi_client_secret: SecretStr | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
