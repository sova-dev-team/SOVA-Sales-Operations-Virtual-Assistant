import csv
import io
from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import DbSession, StaffOrAdminUser
from app.models import ImportErrorRecord, ImportJob
from app.schemas.imports import (
    ImportCommitResponse,
    ImportErrorResponse,
    ImportJobResponse,
    ImportPreviewResponse,
)
from app.services.import_access import get_import_job
from app.services.imports import MAX_IMPORT_BYTES, commit_import, create_import_preview

router = APIRouter(prefix="/api/v1/imports", tags=["imports"])


async def _errors_for(session: DbSession, job_id: UUID) -> list[ImportErrorResponse]:
    errors = list(
        (
            await session.scalars(
                select(ImportErrorRecord)
                .where(ImportErrorRecord.import_job_id == job_id)
                .order_by(ImportErrorRecord.row_number, ImportErrorRecord.field_name)
            )
        ).all()
    )
    return [ImportErrorResponse.model_validate(error) for error in errors]


@router.post("/customers/preview", response_model=ImportPreviewResponse)
async def preview_customer_import(
    file: UploadFile,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> ImportPreviewResponse:
    # Read one byte beyond the policy limit so the service can return a clear
    # 413 response without ever buffering an unbounded upload in memory.
    content = await file.read(MAX_IMPORT_BYTES + 1)
    try:
        job = await create_import_preview(
            session, current_user, file.filename or "customers.csv", content
        )
    except OverflowError as error:
        raise HTTPException(status_code=413, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    await session.commit()
    await session.refresh(job)
    return ImportPreviewResponse(
        job=ImportJobResponse.model_validate(job),
        errors=await _errors_for(session, job.id),
    )


@router.get("/{import_job_id}", response_model=ImportJobResponse)
async def get_import(
    import_job_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> ImportJob:
    job = await get_import_job(session, current_user, import_job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found.")
    return job


@router.get("/{import_job_id}/errors", response_model=list[ImportErrorResponse])
async def get_import_errors(
    import_job_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> list[ImportErrorResponse]:
    job = await get_import_job(session, current_user, import_job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found.")
    return await _errors_for(session, job.id)


@router.post("/{import_job_id}/commit", response_model=ImportCommitResponse)
async def commit_customer_import(
    import_job_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> ImportCommitResponse:
    job = await get_import_job(session, current_user, import_job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found.")
    try:
        created_customers, created_interactions = await commit_import(session, current_user, job)
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="The import conflicts with existing data."
        ) from error
    await session.commit()
    await session.refresh(job)
    return ImportCommitResponse(
        job=ImportJobResponse.model_validate(job),
        created_customer_count=created_customers,
        created_interaction_count=created_interactions,
    )


@router.get("/{import_job_id}/errors/download")
async def download_import_errors(
    import_job_id: UUID,
    current_user: StaffOrAdminUser,
    session: DbSession,
) -> StreamingResponse:
    job = await get_import_job(session, current_user, import_job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found.")
    errors = await _errors_for(session, job.id)
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["row_number", "field_name", "message"])
    writer.writerows([[item.row_number, item.field_name, item.message] for item in errors])
    return StreamingResponse(
        iter([stream.getvalue().encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="import-errors.csv"'},
    )
