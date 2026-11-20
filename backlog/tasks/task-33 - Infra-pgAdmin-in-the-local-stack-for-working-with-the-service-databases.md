---
id: TASK-33
title: 'Infra: pgAdmin in the local stack for working with the service databases'
status: To Do
assignee: []
created_date: '2026-11-20T15:04:00Z'
labels:
  - no-spec
  - infra
dependencies: []
priority: medium
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: browse and query the service databases (catalog, orders, identity) in a UI during development, instead of psql in a container.

Scope:
- A pgAdmin 4 service in docker-compose.yml, image pinned to an exact version, port bound to 127.0.0.1 only (`PGADMIN_PORT`, added to .env.example and to the port check of tools/scripts/preflight.mjs), a memory limit like the other services, its settings in a named volume.
- The three databases pre-registered (servers.json), so nothing has to be typed after `pnpm dev`; local desktop mode without a pgAdmin login. Which role each server uses is decided in the task: the owner for schema work, the service's least-privilege role (catalog_app) to see what the service sees — possibly both entries.
- Whether it starts with `pnpm dev` or only on demand (a Compose profile) is decided in the task, weighing its memory against convenience.
- Local only: never in the deployment Compose (TASK-19); on the VM the database is reached through an SSH tunnel.
- README (URL table, how to open it), docs/technologies.md row, ADR 0018 consulted (infrastructure in Compose).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `pnpm dev` (or the documented on-demand command) starts pgAdmin; http://localhost:$PGADMIN_PORT opens it with the catalog, orders and identity databases listed and connectable
- [ ] #2 pgAdmin listens on 127.0.0.1 only, its image version is pinned and its port is checked by preflight like the others
- [ ] #3 No secret is committed: passwords come from .env / .env.example local defaults; the deployment setup gets no pgAdmin
- [ ] #4 README and docs/technologies.md say how to use it
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
