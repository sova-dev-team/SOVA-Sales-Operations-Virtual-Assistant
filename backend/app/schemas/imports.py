from datetime import datetime
from uuid import UUID

from app.models.entities import ImportJobStatus
from app.schemas.base import APIModel


class ImportErrorResponse(APIModel):
    row_number: int
    field_name: str
    message: str


class ImportJobResponse(APIModel):
    id: UUID
    file_name: str
    status: ImportJobStatus
    total_rows: int
    valid_rows: int
    invalid_rows: int
    created_at: datetime
    completed_at: datetime | None


class ImportPreviewResponse(APIModel):
    job: ImportJobResponse
    errors: list[ImportErrorResponse]


class ImportCommitResponse(APIModel):
    job: ImportJobResponse
    created_customer_count: int
    created_interaction_count: int
