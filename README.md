# SOVA — Sales Operations Virtual Assistant

Portfolio project for an internal sales and operations assistant: scoped
customer management, CSV/XLSX import, operational KPIs, human-reviewed AI email
drafts, support tickets, audit logs, and a Power BI analytical-report seam.

The repository contains a React/TypeScript/Vite frontend, a FastAPI backend, and
PostgreSQL persistence. The imported UX/UI is connected to the versioned API;
the browser never accesses the database directly.

## Run locally

Requirements: Docker Desktop. For running services without containers, use
Python 3.12 with `uv`, Node.js 22, and pnpm 10.34.3.

```powershell
Copy-Item backend\.env.example backend\.env
uv sync --directory backend --extra dev
docker compose --env-file backend\.env up --build
```

Web app: `http://localhost:5173`

API docs: `http://localhost:8000/docs`

Health: `http://localhost:8000/health`

After migrations, load only synthetic demo data:

```powershell
docker compose exec api python -m alembic upgrade head
docker compose exec api python -m scripts.seed_demo
```

Local demo accounts are `staff.demo@example.test` and
`admin.demo@example.test`, both with password `DemoPass123!`. They contain only
synthetic data and must never be reused outside a local demo database.

## Quality checks

From `backend/`:

```powershell
uv run pytest --cov=app --cov-fail-under=80 -q
uv run ruff format --check .
uv run ruff check .
uv run mypy app
uv run alembic heads
```

From `frontend/`:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

See [AGENTS.md](AGENTS.md) for the engineering conventions and
[docs/implementation-plan.md](docs/implementation-plan.md) for phase status.
The complete quality, integration, security, and dependency-update pipelines
are documented in [docs/ci.md](docs/ci.md).
