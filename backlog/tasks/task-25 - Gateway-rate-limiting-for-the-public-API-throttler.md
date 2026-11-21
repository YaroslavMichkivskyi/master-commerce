---
id: TASK-25
title: 'Gateway: rate limiting for the public API (throttler)'
status: To Do
assignee: []
created_date: '2026-11-11T18:50:00Z'
updated_date: '2026-11-21T00:11:00Z'
labels:
  - no-spec
  - backend
  - mvp
dependencies:
  - TASK-7
  - TASK-14
priority: medium
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved into the MVP (owner, 2026-11-21): the public storefront API (TASK-6) takes free input from anyone, so limits must be in place before the shop goes live (TASK-19). Volume attacks are stopped at the edge (TASK-34), not in the gateway.
<!-- SECTION:NOTES:END -->
