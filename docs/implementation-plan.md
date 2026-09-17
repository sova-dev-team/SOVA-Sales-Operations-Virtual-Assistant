# Implementation Plan

Status values: `done`, `in progress`, `blocked`, and `pending`.

## Current delivery order

The backend contract and vertical slices were completed first. The supplied
UX/UI source has now been integrated as the React client and consumes that
contract through a validated API layer.

```text
Phase 0 -> Phase 1 -> Phase 3 backend foundation -> Phase 4–8 backend vertical slices
         -> Phase 9 Power BI integration -> Phase 10 hardening
         -> Phase 2 UX/UI integration -> release
```

## Phase 0 — Scope and vocabulary

**Status:** done

- [x] Product scope and non-goals.
- [x] Actors, roles, and business language in `CONTEXT.md`.
- [x] MVP versus portfolio scope.
- [x] Synthetic import template and demo-data direction.
- [x] Human-review requirement for Email Drafts.

## Phase 1 — System analysis and contracts

**Status:** done

- [x] System architecture and request flows.
- [x] Database entities, keys, cardinality, and invariants.
- [x] Actor/use-case map and permission matrix.
- [x] API conventions, endpoint inventory, and error contract.
- [x] ADRs for modular monolith, visualization split, and human-reviewed AI.

## Phase 2 — UX/UI in Figma

**Status:** done (supplied UX/UI handoff integrated)

The supplied UX/UI source is implemented in `frontend/`. The original design
brief remains in `docs/product/figma-ux-ui-prompt.md`.

- [x] Information architecture and role-aware navigation.
- [x] User flows for import, customer management, analytics, email review, and tickets.
- [x] Reusable layout and component variants from the supplied UX/UI.
- [x] Desktop dashboard and responsive navigation states.
- [x] Developer handoff integrated into the application repository.

## Phase 3 — Technical foundation

**Status:** done

- [x] Monorepo structure, environment templates, and Docker Compose.
- [x] FastAPI app factory, settings, health check, logging, and error middleware.
- [x] SQLAlchemy session, Alembic scaffold, and backend test foundations.
- [x] React/Vite strict TypeScript setup with Tailwind CSS, query client, validated API client, and protected application shell.
- [x] Backend formatter, linter, type check, test, and migration-check scripts.

## Phase 4 — Authentication and access

**Status:** done

- [x] User model and migrations.
- [x] Scrypt password hashing, access/refresh tokens, logout, and session expiry.
- [x] Admin/Staff authorization dependencies and permission tests.
- [x] Login, protected application shell, role-based navigation, and User management UI.

## Phase 5 — Customer data and import

**Status:** done

- [x] Customer, Product, Interest, and Interaction models.
- [x] Customer CRUD, search, filters, sorting, pagination, and ownership.
- [x] CSV/XLSX preview, normalization, validation, duplicate detection, and transaction.
- [x] Import errors, correction flow, download-errors action, and tests.
- [x] Customer list/detail/create/edit, interaction history, and import UI.

## Phase 6 — Operational analytics

**Status:** done

- [x] KPI definitions and query implementations.
- [x] Customer, product, interaction, and Follow-up summaries.
- [x] React KPI cards, charts, tables, loading, empty, and error states.
- [x] Query indexes and correctness tests.

## Phase 7 — AI Email Drafts

**Status:** done

- [x] AI Provider interface and deterministic fake adapter.
- [x] Vietnamese/English prompt templates and structured output.
- [x] Minimized context builder and human-review state machine.
- [x] Email Draft state machine and audit events.
- [x] Composer, edit, review, approve, reject, and history UI.

## Phase 8 — Support and audit

**Status:** done

- [x] Support Ticket and comment models.
- [x] Status, priority, category, assignment, and permission rules.
- [x] Ticket list/detail/timeline UI.
- [x] Audit capture, redaction, filtering, and Admin viewer API.

## Phase 9 — Power BI

**Status:** done

- [x] Semantic model and report measures documented.
- [x] Power BI configuration seam and short-lived embed-config endpoint.
- [x] React `powerbi-client-react` integration and embed-config refresh.
- [x] Loading, authorization failure, expiry, and fallback states.
- [x] Synthetic-data-only public demo path.

## Phase 10 — Hardening and portfolio delivery

**Status:** done (deployment artifacts remain pending)

- [x] Backend unit/integration tests and critical API journeys.
- [x] Security checks for auth, uploads, SQL scope, AI context, and Power BI secrets.
- [x] Dockerfile, migration checks, CI quality gates, and reproducible lockfile.
- [x] Backend README, API docs, diagrams, and changelog.
- [x] Frontend quality gates, container, API contract generation, and local documentation.
- [ ] Production deployment, screenshots, and demo recording after UX/UI.

## Quality gates

Each phase closes only when its acceptance criteria, tests, documentation, and
security implications are reviewed. A phase may be demonstrated before every
future phase is complete, but a later phase must not silently change an accepted
contract; contract changes require an ADR or an update to the relevant spec.
