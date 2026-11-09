---
id: TASK-2
title: 'Walking skeleton: monorepo, one end-to-end page, Compose, CI'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-08T15:32:00Z'
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
- [ ] #1 A browser page shows a row read from the database through gateway and service
- [ ] #2 `pnpm dev` starts the whole stack on Windows, macOS and Linux
- [ ] #3 CI is green on a PR to dev
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
