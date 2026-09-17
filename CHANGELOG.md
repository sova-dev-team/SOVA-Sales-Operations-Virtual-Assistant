# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Changed

- Redesigned the operational dashboard around actionable follow-ups, live interaction trends, product interest, support queues, and responsive quick actions.

### Added

- FastAPI application factory with health endpoint and stable problem-details errors.
- Request ID propagation, input validation, and HTTP request logging middleware.
- Async SQLAlchemy engine/session factory, Alembic scaffold, and transactional seed runner.
- Backend development container, PostgreSQL Compose service, and reproducible `uv.lock`.
- Foundation tests covering configuration, database setup, errors, request IDs, health, and seed rollback.
- Scrypt authentication with access/refresh rotation, logout, session expiry, and Admin/Staff RBAC.
- Customer, product, interaction, import-job, email-draft, support-ticket, and audit-log domain slices with an Alembic migration.
- Scoped customer CRUD, follow-up detection, CSV/XLSX preview/validation/duplicate detection, row-level import errors, and atomic commit.
- Operational KPI/query endpoints, deterministic Vietnamese/English human-reviewed email drafts, and ticket lifecycle/comment APIs.
- Power BI report/embed-config/refresh-status adapter seam that keeps secrets server-side and uses synthetic demo data.
- CI quality gates for formatting, linting, strict typing, migrations, and at least 80% test coverage.
- Upload-size guardrails and strict CSV/XLSX header/row validation to prevent unbounded buffering and silent column truncation.
- React/TypeScript SOVA interface for authentication, customers, imports, operational analytics, AI email review, support tickets, audit logs, user management, and Power BI embedding.
- Runtime-validated API client generated from the FastAPI OpenAPI contract, with bearer-token refresh and TanStack Query cache coordination.
- Frontend container, local API proxy, configurable backend CORS policy, and independent frontend CI quality gates.
