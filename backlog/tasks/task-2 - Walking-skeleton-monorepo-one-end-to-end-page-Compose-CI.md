---
id: TASK-2
title: 'Walking skeleton: monorepo, one end-to-end page, Compose, CI'
status: In Progress
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-12T13:29:00Z'
labels:
  - mvp
  - speckit-light
  - infra
dependencies:
  - TASK-1
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pull one thin thread through the whole system so every later slice plugs into a working app.

Scope:
- pnpm workspaces (`apps/*`, `shared/*`, `packages/*`, …) + Turborepo; shared tsconfig / ESLint / Prettier
- `shared/dto` package with the DTO of the skeleton endpoint (ADR 0016)
- `catalog-service` (NestJS) with one endpoint and one table; `api-gateway` proxying to it
- `web` (Next.js) page that renders that data on the server
- `docker-compose.yml`: Postgres x3, RabbitMQ; `pnpm dev` starts everything
- `ci` workflow (lint, typecheck, tests of affected packages), `main` protection, Dependabot

Spec: `specs/002-walking-skeleton/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A browser page shows a row read from the database through gateway and service
- [ ] #2 `pnpm dev` starts the whole stack on Windows, macOS and Linux
- [ ] #3 CI is green on a PR to dev
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-light: spec specs/002-walking-skeleton -> plan -> tasks -> implement
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Quickstart verification (T028, T029), 2026-11-12, commit db7041f

Both runs from a fresh `git clone -b task-2` into an empty folder, `pnpm install --frozen-lockfile`, no `.env` (created by the preflight).

**Windows 11, Docker Desktop 29.9, Node 24** — scenarios 1-7 and 9 of `specs/002-walking-skeleton/quickstart.md`:
- S1: install 28 s. `pnpm dev` on empty volumes: 4 containers healthy, gateway, catalog and page answer after 42 s; warm restart 32 s (NFR-001: < 60 s). The very first start after the install answered the page only after ~6 min: Turbopack waited for the file system to settle in the fresh `node_modules` (one-off, not seen on later starts).
- S2: server HTML lists the 6 seeded categories, "Graphics cards" present.
- S3: `insert … 'Monitors'` via `docker compose exec` → last on the page after reload.
- S4: `/docs` 200 on 3001 and 3002; `/docs-json` paths: gateway `/health`, `/api/v1/categories`; catalog `/categories`, `/health`.
- S5: catalog killed → gateway `503 application/problem+json` (`catalog-service is unavailable`), page shows "The catalog is unavailable right now".
- S6: restart → 7 rows, 7 distinct slugs (seed idempotent).
- S7: `format:check`, `lint`, `typecheck` clean; unit 9/9 (web 4, gateway 3, catalog 2); integration 13/13 (gateway 7, catalog 6).
- S9: `pnpm stop` keeps the 4 volumes, `pnpm reset` removes them.

**Linux (Debian bookworm, `node:24` 24.22, kernel 6.6 WSL2)** — scenarios 1, 2, 7; Docker of the host through its socket, so `.env` points the database URL at `host.docker.internal` and Testcontainers uses `TESTCONTAINERS_HOST_OVERRIDE`:
- S1: install 26 s; stack ready after 12 s (images cached).
- S2: 6 seeded categories in the server HTML.
- S7: format, lint, typecheck clean; unit 9/9, integration 13/13.

**Not verified:** macOS (no machine). Everything it needs is cross-platform (Node scripts, Compose, no shell-specific syntax). CI on GitHub (AC #3) runs on the PR.

Install note: pnpm skips the install scripts of `@scarf/scarf` (telemetry), `cpu-features`, `ssh2` (optional native parts of the Docker client used by Testcontainers) and `protobufjs`; nothing needs them.

## AI review (close-task step 4), 2026-11-12

Two `/code-review` runs on the branch diff against `origin/dev`; every finding verified before a fix (code read, failing test or run), each fix with a regression analysis and a test that fails without it.
- Run 1, 10 findings, all real. Fixed: CI concurrency on push runs, preflight port names from `.env.example`, contract `whitelist` in the gateway, slow-body timeout → 503, RFC 9457 titles from `node:http`, catalog problem+json filter, pg connection timeout, web guard for a body without `items`, `.env` resolved from the app's own files. Moved to TASK-4 (AC #4): DTO rules enforced in the database.
- Run 2, 10 findings: 3 repeats of run 1 (already fixed), 7 new and real, all fixed: gateway 502 for a non-object body, error bodies cancelled, config validated at start-up (gateway and catalog), `/health` no longer returns the driver message, the Next wrapper forwards stop signals (checked in a Linux container: before, Next outlived the wrapper on SIGTERM/SIGINT/SIGHUP), CI builds the apps, `docker-compose.yml` cites ADR 0018.

## Final verification, 2026-11-12, commit 994b2ea

- `pnpm format:check` clean; `turbo run lint typecheck test test:integration build --force`: 17/17 tasks. Unit: web 8, gateway 16, catalog 12; integration: gateway 14, catalog 8.
- `turbo run build` also passes without `.env`, as in CI.
- `pnpm dev` on Windows: the page at http://localhost:3000 renders the categories read from PostgreSQL through api-gateway and catalog-service.
<!-- SECTION:NOTES:END -->
