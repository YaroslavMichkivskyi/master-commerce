# Tasks: Walking skeleton

**Input**: `plan.md`, `research.md`, `data-model.md`, `contracts/http.md`, `quickstart.md`
**Mode**: speckit-light — phases by layer of the thread, each phase is one or more commits on `task-2`, each reviewed by the owner before it is made (ADR 0017).
`[P]` = can run in parallel (different files, no dependency on an unfinished item).

## Phase 1 — Workspace setup (FR-040, FR-042, FR-043)
- [X] T001 Root `package.json` (private, `packageManager: pnpm@10.15.0`, `engines`, scripts), `pnpm-workspace.yaml`, `.nvmrc`
- [X] T002 [P] `turbo.json` with tasks `build`, `dev` (persistent, `^build`), `lint`, `typecheck`, `test`, `test:integration`
- [X] T003 [P] `tsconfig.base.json` (strict, decorators, NodeNext)
- [X] T004 [P] `eslint.config.mjs` (typescript-eslint, `consistent-type-imports`), `.prettierrc.json`, `.prettierignore`
- [X] T005 [P] `.env.example`, `tools/scripts/preflight.mjs` (creates `.env`, stops on a busy port), `.gitignore` entries (`node_modules`, `dist`, `.next`, `.turbo`, `.env`)
- [X] T006 `pnpm install` → commit `pnpm-lock.yaml`

## Phase 2 — Local infrastructure (FR-041, NFR-001, NFR-002)
- [X] T007 `docker-compose.yml`: 3 × `postgres:17.11-alpine`, `rabbitmq:4.3.7-management-alpine`, health checks, `mem_limit`, ports from `.env`, named volumes
- [X] T008 Root scripts `dev` / `stop` / `reset`; `docker compose up -d --wait` verified

## Phase 3 — Shared DTO (FR-020)
- [X] T009 `shared/dto` package: `CategoryDto`, `CategoryListDto`, `ProblemDto` with class-validator + `@ApiProperty`; `tsc` build + watch

## Phase 4 — catalog-service (FR-001..FR-004, FR-012)
- [X] T010 Nest app skeleton: `main.ts` (validation pipe, Swagger at `/docs`), `app.module.ts`, `config.ts`
- [X] T011 Drizzle schema `category`, drizzle-kit config, generated migration `drizzle/0000_*.sql`
- [X] T012 `db/` module: pg pool provider, migrate on start, idempotent seed
- [X] T013 `categories` controller + service (`GET /categories`)
- [X] T014 `health` (terminus, database ping)
- [X] T015 [P] Unit test: service maps rows → DTOs in order
- [X] T016 Integration test (Testcontainers): migrate + seed twice → 6 rows, `GET /categories` 200, health 200; contract: response validates as `CategoryListDto`, routes present in `/docs-json`

## Phase 5 — api-gateway (FR-010..FR-012)
- [X] T017 Nest app skeleton with Swagger at `/docs`, `/health`
- [X] T018 `CatalogClient` (fetch + `AbortSignal.timeout`), `GET /api/v1/categories`
- [X] T019 `ProblemFilter` + upstream error mapping (503 / 502, `application/problem+json`)
- [X] T020 Integration test with a stub upstream (local HTTP server): 200 pass-through, timeout / refused → 503, upstream 500 → 502; contract: routes in `/docs-json`

## Phase 6 — web (FR-030)
- [X] T021 Next app: `app/layout.tsx`, `app/page.tsx` (force-dynamic), `lib/gateway.ts` (type-only DTO import)
- [X] T022 Unit test: page renders list / empty / unavailable with mocked fetch

## Phase 7 — CI and repository (FR-050..FR-053)
- [X] T023 `.github/workflows/ci.yml` (pnpm cache, `turbo run … --affected`, concurrency)
- [X] T024 [P] `.github/dependabot.yml` (npm + github-actions, weekly, grouped)
- [ ] T025 [P] FR-053 rule: `main` only through PRs with green CI, written in `docs/playbooks/release.md` (not enforced by GitHub on the free plan)

## Phase 8 — Docs and verification
- [ ] T026 ADR 0018 (local stack), ADR 0019 (test tooling), ADR index, roadmap ADR table
- [ ] T027 `docs/technologies.md` (planned → in use, new rows), `README.md` Getting started
- [ ] T028 Run `quickstart.md` scenarios 1–7 on Windows, 1/2/7 on Linux (Docker); record evidence in TASK-2 notes
- [ ] T029 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` green
