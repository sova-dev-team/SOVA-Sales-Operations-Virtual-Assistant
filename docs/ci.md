# Continuous Integration

SOVA uses a streamlined GitHub Actions quality workflow in `.github/workflows/ci.yml`.
It runs with read-only repository permissions by default, cancels superseded runs,
and pins third-party actions to commit SHAs.

## Quality and Security Gates

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch:

- **Backend quality and migrations (`backend`):** locked `uv` dependency sync, Ruff
  format/lint, strict mypy, pytest with an 80% coverage floor, and PostgreSQL 16
  Alembic migration upgrade and drift check.
- **Frontend quality and build (`frontend`):** frozen pnpm install, Prettier
  format check, Oxlint, strict TypeScript typecheck, Vitest, and a production Vite build.
- **Security audit (`security`):** Gitleaks scan across Git history for committed
  secrets, `pip-audit` for locked production Python dependencies, Bandit SAST scan
  for insecure Python patterns, and `pnpm audit` for production frontend dependencies.

## Recommended branch protection

Protect the release branch (`main`) and require these 3 checks before merging:

- `Backend quality and migrations`
- `Frontend quality and build`
- `Security audit`

Keep **Require branches to be up to date before merging** enabled.

## Local equivalents

Run the backend and frontend commands documented in the root `README.md`. For
security checks:

```powershell
uv export --directory backend --frozen --no-dev --no-emit-project --no-hashes --output-file backend/requirements-audit.txt
uvx --from pip-audit==2.10.1 pip-audit --requirement backend/requirements-audit.txt --strict
Remove-Item backend/requirements-audit.txt
uvx bandit==1.9.4 -r backend/app -q -ll
corepack pnpm@10.34.3 --dir frontend audit --prod --audit-level=high
```
