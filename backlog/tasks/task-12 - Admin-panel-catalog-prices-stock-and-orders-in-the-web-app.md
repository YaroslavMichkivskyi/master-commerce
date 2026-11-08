---
id: TASK-12
title: 'Admin panel: catalog, prices, stock and orders in the web app'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-full
  - web
dependencies:
  - TASK-4
  - TASK-7
  - TASK-11
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- web (role admin): brands, categories and attributes, products (spec form driven by the category schema), prices and stock, publication, orders and status changes

Spec: `specs/012-admin-panel/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A product is created and published without an API client
- [ ] #2 An order is moved to shipped from the panel
- [ ] #3 Non-admin users cannot open the panel
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
