---
id: TASK-31
title: 'Catalog: bulk product import, export and price updates'
status: To Do
assignee: []
created_date: '2026-11-16T23:02:00Z'
labels:
  - post-mvp
  - speckit-full
  - backend
  - web
  - data
dependencies:
  - TASK-20
priority: medium
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Catalog managers work with thousands of products at once, not one form at a time.

Scope:
- CSV import of products: create or update by SKU, every row checked against its category's attributes; valid rows stored, invalid rows reported with the row number and the reason
- CSV export of a filtered product list, in the same format the import reads
- bulk price and stock changes on a filtered set (a new value or a percentage)
- large files streamed and processed as a background job with progress
- admin API and the admin panel (TASK-12)
- catalog-service, api-gateway, web, shared/dto
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Importing a CSV of 10 000 products creates or updates them by SKU; every invalid row is reported with its row number and reason, and the valid rows are stored
- [ ] #2 An exported list imported back changes nothing
- [ ] #3 A bulk price change on a filtered set is applied to every selected product or, on failure, to none
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
