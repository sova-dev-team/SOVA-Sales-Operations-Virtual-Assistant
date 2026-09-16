from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ImportJob, User
from app.models.entities import UserRole


async def get_import_job(session: AsyncSession, user: User, job_id: UUID) -> ImportJob | None:
    statement = select(ImportJob).where(ImportJob.id == job_id)
    if user.role is UserRole.STAFF:
        statement = statement.where(ImportJob.created_by_id == user.id)
    result = await session.scalars(statement)
    return result.first()
