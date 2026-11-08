---
id: TASK-10
title: 'Checkout: orders, statuses, payment stub, order.placed'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - web
  - events
dependencies:
  - TASK-8
  - TASK-9
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- checkout: address, delivery method, payment stub (success / failure), order creation
- statuses pending -> confirmed -> shipped -> delivered, cancelled; order history
- `order.placed` via the outbox (TASK-8)
- web: checkout, order-accepted page, history and details

Spec: `specs/010-checkout/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A customer places an order and sees it in the history
- [ ] #2 `order.placed` reaches the broker exactly once per order
- [ ] #3 A failed payment leaves the order in a defined state
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
