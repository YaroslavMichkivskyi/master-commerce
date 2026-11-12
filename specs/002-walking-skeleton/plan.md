# Implementation Plan: Walking skeleton

**Branch**: `task-2` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-walking-skeleton/spec.md`

## Summary

A pnpm + Turborepo monorepo with three apps and one shared package:
- `catalog-service` (NestJS + Drizzle) owns a `category` table, migrates and seeds it
  on start, and serves `GET /categories`;
- `api-gateway` (NestJS) exposes `GET /api/v1/categories` and forwards it with a typed
  `fetch` client, mapping failures to RFC 9457;
- `web` (Next.js App Router) renders the list on the server;
- `@master-commerce/dto` holds the DTO classes (validation + Swagger).

Docker Compose runs the infrastructure only (3 × Postgres 17, RabbitMQ 4). `pnpm dev`
starts it and then the apps with hot reload. A `ci` workflow runs lint, typecheck,
unit / contract and Testcontainers integration tests for affected packages.
Dependabot covers npm and Actions. Decisions: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict) on Node.js 24 LTS (engines ≥22.12) — R-1, R-2

**Primary Dependencies**:
- pnpm 10.15.0 and Turborepo 2.11.10;
- NestJS 12.4 with `@nestjs/swagger` 12.1, `@nestjs/config`, `@nestjs/terminus`;
- class-validator 0.15.1 and class-transformer 0.5.1;
- Drizzle ORM 0.45.4, drizzle-kit 0.31.11 and pg 8.23.1;
- Next.js 16.4.5 and React 19.3.1;
- ESLint 10 with typescript-eslint 8.72 and Prettier 3.9.

**Storage**: PostgreSQL 17.11 (`postgres:17.11-alpine`). Three databases (identity,
catalog, orders); only `catalog` gets a schema now.

**Testing**: Vitest 5.1 (+ unplugin-swc for Nest), supertest 7.3, Testcontainers 12.2 — R-7

**Target Platform**: developer machines on Windows / macOS / Linux; GitHub-hosted `ubuntu-24.04` for CI

**Project Type**: web application — a monorepo of services + a web app

**Performance Goals**: warm `pnpm dev` < 60 s (NFR-001); docs-only CI < 3 min (NFR-003)

**Constraints**: the stack fits in 4 GB of RAM (NFR-002); every version pinned (NFR-004); no secrets in git (FR-042)

**Scale/Scope**: 3 apps, 1 shared package, 1 table, 3 endpoints + 2 health endpoints, 1 page

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Ordinary shop, no speculative features | pass | one table, one list endpoint and one page. Identity and orders databases are only started (mvp-plan §3). No placeholder modules |
| II. Spec is the source of truth | pass | every FR mapped below. Spec amended for FR-053 per the owner's decision |
| III. Local first, explicit data access | pass | Compose infra, apps on host. Drizzle with committed SQL migrations. The seed is a fixed list (the deterministic generator is TASK-5) |
| IV. Tests ship with the change | pass | unit + contract + Testcontainers integration, in CI (R-7, R-9) |
| V. Observable by default | pass with note | `/health` everywhere. `/metrics`, JSON logs and correlation id come with the chassis (TASK-3); the constitution requires them "once it exists" |
| VI. No scope creep, decisions recorded | pass | Out of Scope respected. Two lasting decisions → ADR 0018, 0019 |
| VII. Git workflow and approval | pass | branch `task-2`, Conventional Commits, push / PR behind approval |
| Gate: versions pinned, cross-platform | pass | exact versions in `package.json` (no `^`), `packageManager`, image tags. Scripts in Node, no shell-specific syntax |
| Gate: technologies.md | pass | rows switch from planned to in use, plus new rows (Vitest, Testcontainers, Corepack, ESLint / Prettier, Dependabot) |
| Gate: Swagger for every endpoint | pass | FR-012. A contract test fails if a route is missing from `/docs-json` |
| Gate: English | pass | — |

Post-design re-check: unchanged, no violations. Complexity Tracking is empty.

## Requirement mapping

| Requirement | Design | Verified by |
|---|---|---|
| FR-001, FR-002 | `apps/catalog-service/src/db/schema.ts`, `drizzle/0000_*.sql`, `db/migrate.ts`, `db/seed.ts` | integration: migrate twice + seed twice → 6 rows |
| FR-003 | `categories.controller.ts` / `categories.service.ts` | unit + integration + contract |
| FR-004 | `health.controller.ts` (terminus `pingCheck` via pg) | integration: 200 up / 503 when the container is stopped |
| FR-010 | `apps/api-gateway/src/catalog/catalog.client.ts`, `categories.controller.ts` | integration with a stub upstream |
| FR-011 | `common/problem.filter.ts` + client error mapping | integration: timeout → 503, upstream 500 → 502 |
| FR-012 | `SwaggerModule` at `/docs` in both `main.ts` (shared `setupSwagger` in each app) | contract: every route in `/docs-json` |
| FR-020 | `shared/dto/src/category.dto.ts`, `problem.dto.ts` | typecheck. Lint rule `consistent-type-imports` in `web` |
| FR-030 | `apps/web/app/page.tsx`, `lib/gateway.ts` | unit (render with mocked fetch: list / empty / unavailable) |
| FR-040 | `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json` at root | `pnpm lint`, `pnpm typecheck` |
| FR-041 | `docker-compose.yml`, root scripts `dev` / `stop` / `reset` | quickstart 1, 9 |
| FR-042 | `.env.example`, `tools/scripts/preflight.mjs`, `.env` gitignored | quickstart 1 |
| FR-043 | `turbo.json` tasks `lint typecheck test test:integration build dev`; `--affected` | CI log |
| FR-050 | `.github/workflows/ci.yml` | green check on the PR (AC #3) |
| FR-051 | `apps/catalog-service/test/categories.int.test.ts`, `apps/api-gateway/test/*.int.test.ts` | CI |
| FR-052 | `.github/dependabot.yml` | Dependabot tab after merge |
| FR-053 | `docs/playbooks/release.md` rule | review |
| NFR-001..004 | R-8 limits and `--wait`; R-9 `--affected`; exact versions | quickstart 1, CI timing |

## Project Structure

### Documentation (this feature)

```text
specs/002-walking-skeleton/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/http.md
└── tasks.md            # next: speckit-tasks
```

### Source Code (repository root)

```text
package.json            # private root: packageManager pnpm@10.15.0, scripts dev/stop/reset/lint/typecheck/test
pnpm-workspace.yaml     # apps/*, shared/*, packages/*, tools/*
turbo.json
tsconfig.base.json
eslint.config.mjs  .prettierrc.json  .prettierignore  .nvmrc  .env.example
docker-compose.yml
tools/scripts/preflight.mjs
shared/dto/             # @master-commerce/dto: src/{category.dto.ts, problem.dto.ts, index.ts}; built with tsc
apps/
  catalog-service/      # NestJS: src/{main.ts, app.module.ts, config.ts, db/, categories/, health/}; drizzle/; test/
  api-gateway/          # NestJS: src/{main.ts, app.module.ts, config.ts, catalog/, common/problem.filter.ts, health/}; test/
  web/                  # Next.js: app/{layout.tsx, page.tsx}, lib/gateway.ts, test/
.github/workflows/ci.yml
.github/dependabot.yml
docs/adr/0018-local-stack-infra-in-compose-apps-on-host.md
docs/adr/0019-test-tooling-vitest-testcontainers.md
```

`packages/` is not created yet: its first runtime library (outbox) comes with TASK-8
(constitution I).

**Structure Decision**: the layout of mvp-plan §8, limited to what this slice uses.
`shared/dto` is compiled (`tsc`, watch mode in `dev`), so that Nest and Next consume
plain JS + `.d.ts`. In Turborepo `dev` and `build` depend on `^build`.

## Docs touched in this task

- `README.md`: Getting started (`pnpm dev`, ports, stop / reset).
- `docs/technologies.md`: planned → in use for pnpm / Turborepo, TS, Node, NestJS,
  Postgres, Drizzle, Next / React, Compose, Actions, Dependabot, OpenAPI. New rows:
  Corepack, Vitest, Testcontainers, supertest, ESLint / Prettier, terminus.
- `docs/adr/` 0018, 0019 + index. `release.md` gets the FR-053 rule (it is not
  enforced by GitHub).
- `docs/roadmap.md` ADR table.

## Complexity Tracking

None.
