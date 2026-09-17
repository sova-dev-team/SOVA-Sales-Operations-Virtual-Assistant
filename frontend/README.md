# SOVA frontend

React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, and Zod frontend for SOVA.

## Local development

Use Node.js 22 and pnpm 10.34.3.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The development server listens on `http://localhost:5173` and proxies `/api` to `http://localhost:8000` by default. Copy `.env.example` to `.env` only when the API target differs.

The browser never connects directly to PostgreSQL. All data access goes through the authenticated FastAPI `/api/v1` contract.

## Generated API types

After changing a FastAPI contract, run from the repository root:

```powershell
uv run --directory backend python -m scripts.export_openapi
pnpm --dir frontend generate:api
```

Do not edit `src/api/openapi.json` or `src/api/generated.ts` manually.

## Quality checks

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
