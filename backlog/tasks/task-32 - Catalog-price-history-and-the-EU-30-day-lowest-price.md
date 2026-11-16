---
id: TASK-32
title: 'Catalog: price history and the EU 30-day lowest price'
status: To Do
assignee: []
created_date: '2026-11-16T23:02:00Z'
labels:
  - post-mvp
  - speckit-light
  - backend
  - web
  - data
dependencies:
  - TASK-20
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a product is shown as discounted, the EU rules (Directive 2019/2161, the Omnibus directive) require the previous price to be the lowest price of the 30 days before the reduction.

Scope:
- every price change of a product kept with its time (may reuse the change history of the catalog)
- the lowest price of the 30 days before the current price was set, per product
- storefront: a reduced price shows that lowest price as the previous one, never an arbitrary earlier price
- catalog-service, api-gateway, web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every price change of a product is kept with its time
- [ ] #2 The API returns, for a product, the lowest price of the 30 days before its current price was set
- [ ] #3 A product page shows a previous price only when the current one is lower, and only as that 30-day lowest price
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
