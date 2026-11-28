---
id: TASK-40
title: >-
  Infra: the whole dev stack in Docker — apps with hot reload, nothing bound to
  the host
status: To Do
assignee: []
created_date: '2026-11-28T09:02:00Z'
labels:
  - speckit-light
  - infra
dependencies: []
priority: medium
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: develop without Node or pnpm on the host. Today (ADR 0018) only the infrastructure runs in Compose and the apps (web, api-gateway, catalog-service) run on the host with hot reload; the visual tests of TASK-36 already run wholly in Docker. Scope: the apps run in Compose containers next to the databases and RabbitMQ, the source mounted, node_modules inside the containers (built for Linux), hot reload working on Windows, macOS and Linux; the same commands for build, lint and tests in containers. Touches: docker-compose.yml, Dockerfiles for development, package scripts, README, docs/adr (replaces ADR 0018), docs/technologies.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docker compose up starts the shop on localhost:3000 with the catalog; a change to a file under apps/* shows without a restart within 3 seconds on Windows
- [ ] #2 No Node or pnpm on the host is needed to develop, build or test; the commands are in the README
- [ ] #3 An ADR on the new dev stack replaces ADR 0018; docs/technologies.md is updated
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
