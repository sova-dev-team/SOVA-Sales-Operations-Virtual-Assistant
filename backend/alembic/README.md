# Alembic migrations

Create a migration from the `backend` directory:

```text
alembic revision -m "create users"
```

Review generated SQL and the downgrade path before applying it. Applied
migrations are immutable; create a new migration for every later change.

Seed data must be synthetic and idempotent. Register ordered async seed steps
with `app.core.seed.run_seeders`; all steps execute in one transaction so a
failure cannot leave a partial seed.
