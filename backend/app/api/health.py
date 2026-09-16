from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import Settings, get_settings

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


SettingsDependency = Annotated[Settings, Depends(get_settings)]


@router.get("/health", response_model=HealthResponse, summary="Check API health")
def get_health(settings: SettingsDependency) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.service_name, version=settings.app_version)
