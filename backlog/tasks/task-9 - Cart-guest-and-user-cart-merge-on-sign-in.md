---
id: TASK-9
title: 'Cart: guest and user cart, merge on sign-in'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - web
dependencies:
  - TASK-6
  - TASK-7
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- `order-service`: guest cart (cookie id) and user cart, merge on sign-in, price snapshot with staleness check, quantity limited by stock
- web: mini cart, cart page

Spec: `specs/009-cart/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A guest adds products, signs in, and the cart is kept
- [ ] #2 A changed price is shown to the customer before checkout
- [ ] #3 Quantity above available stock is refused
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
