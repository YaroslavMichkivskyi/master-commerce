---
id: TASK-30
title: 'Catalog: change history of brands, categories and products'
status: To Do
assignee: []
created_date: '2026-11-16T23:02:00Z'
labels:
  - post-mvp
  - speckit-light
  - backend
  - data
dependencies:
  - TASK-20
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Who changed what in the catalog, and when, for every admin change.

Scope:
- an append-only history of every create, update, delete and restore of brands, categories (with their attributes) and products: actor, time, entity, and the old and new value of each changed field
- written in the same transaction as the change, so a change never lands without its entry and a failed change leaves none
- admin API: the history of one entity, newest first, paged
- the actor comes from sign-in (TASK-7)
- catalog-service, api-gateway, shared/dto
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every create, update, delete and restore of a brand, category or product adds one history entry with the actor, the time and each changed field's old and new value
- [ ] #2 A change that fails leaves no history entry, and no change is stored without its entry
- [ ] #3 The admin API returns an entity's history newest first, paged, documented in OpenAPI
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
