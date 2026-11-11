---
id: TASK-25
title: 'Gateway: rate limiting for the public API (throttler)'
status: To Do
assignee: []
created_date: '2026-11-11T18:50:00Z'
labels:
  - post-mvp
  - no-spec
  - backend
dependencies:
  - TASK-20
priority: low
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Protect the public API from abuse and accidental floods beyond the sign-in limit of TASK-7.

Scope:
- global and per-route limits in api-gateway (@nestjs/throttler or an equivalent; compare)
- shared storage for the counters (e.g. Redis) so limits hold with several gateway instances
- 429 responses as RFC 9457 problem details with Retry-After; limits documented in Swagger
- limits configurable per environment; k6 check that the limit triggers
- ADR, docs/technologies.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Requests above the limit get 429 problem+json with Retry-After
- [ ] #2 Limits are shared between gateway instances
- [ ] #3 Limits are configurable and documented in Swagger
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
