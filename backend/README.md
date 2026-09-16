# AI Sales & Operations API

FastAPI backend for the internal AI sales and operations assistant. The
authentication, customer/import, analytics, human-reviewed email, support,
audit, and Power BI adapter slices are implemented here. React/TypeScript and
Figma UX/UI remain intentionally deferred until the final delivery phase.

## Local setup

From `backend/`:

```powershell
uv sync --extra dev
uv run uvicorn app.main:app --reload
```

Alternatively, with a regular Python 3.12 installation:

```powershell
& "<bundled-python>" -m pip install -e ".[dev]"
Copy-Item .env.example .env
& "<bundled-python>" -m uvicorn app.main:app --reload
```

The bundled Python path is supplied by the Codex workspace runtime. A regular
Python 3.12 installation works as well.

## Development checks

```powershell
python -m pytest -q
python -m ruff check .
python -m ruff format --check .
python -m mypy app
python -m alembic heads
```

The CI pipeline enforces the same checks and requires at least 80% meaningful
coverage. To load synthetic demo data after applying migrations:

```powershell
python -m alembic upgrade head
python -m scripts.seed_demo
```

Demo credentials are synthetic and documented in `app/core/demo_seed.py`; never
reuse them outside a local demo database.

## Docker Compose

From the repository root, start the API and PostgreSQL development services:

```powershell
docker compose --env-file backend\.env up --build
```

The API is available at `http://localhost:8000`; interactive OpenAPI docs are
at `http://localhost:8000/docs`.
