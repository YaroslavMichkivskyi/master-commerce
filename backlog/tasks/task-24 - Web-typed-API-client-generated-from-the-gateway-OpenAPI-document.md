---
id: TASK-24
title: 'Web: typed API client generated from the gateway OpenAPI document'
status: To Do
assignee: []
created_date: '2026-11-09T23:18:00Z'
labels:
  - mvp
  - speckit-light
  - web
dependencies:
  - TASK-6
priority: low
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The web app should depend on the public contract of api-gateway, not on internal DTO classes of the services.

Today (TASK-2) web imports @master-commerce/dto as types only, guarded by a lint rule; that keeps Nest and class-validator out of the browser bundle but couples web to backend classes.

Scope:
- generate TypeScript types and a typed fetch client for web from the gateway OpenAPI document (openapi-typescript + openapi-fetch or an equivalent; compare options)
- the OpenAPI document is produced in CI / a script and kept in sync; a stale client fails the build
- web stops importing @master-commerce/dto
- ADR (amends ADR 0016) and docs/technologies.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 web calls the gateway only through the generated client and has no import of @master-commerce/dto
- [ ] #2 A gateway contract change that breaks web fails typecheck in CI
- [ ] #3 The client generation runs with one command and in CI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
