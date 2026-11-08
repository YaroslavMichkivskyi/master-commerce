---
id: TASK-11
title: 'Stock saga: reservation choreography and compensation'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - events
dependencies:
  - TASK-10
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The stock-reservation saga (ADR 0007).

Scope:
- `order.placed` -> catalog reserves (`stock.reserved` / `stock.rejected`) -> order confirms / cancels
- compensation on cancellation and payment timeout; reservation expiry; race protection

Spec: `specs/011-stock-saga/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With parallel orders for the last unit exactly one is confirmed
- [ ] #2 A cancelled order returns its stock
- [ ] #3 An expired reservation is released automatically
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
