---
id: TASK-38
title: 'Web: search suggestions and recent searches in the header search'
status: To Do
assignee: []
created_date: '2026-11-27T23:15:00Z'
labels:
  - no-spec
  - web
  - backend
dependencies: []
priority: medium
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: help the customer find a product while typing. Scope: as the customer types in the header search (from 2 characters, debounced), a list under the field suggests matching products, categories and brands, each a link; the customer's last searches (kept in the browser only, never sent to the server) are offered when the empty field gets focus, and can be cleared. Touches: catalog-service (a suggest endpoint on PostgreSQL FTS / prefix match, ADR 0009), api-gateway (public route, OpenAPI), apps/web (a client island over the existing GET search form; without JavaScript the form works as now). Relation: TASK-35 may replace the suggestion source with a search engine; this task keeps the contract so it can.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Typing at least 2 characters in the header search shows up to 8 suggestions (products, categories, brands) as links within 300 ms on the local 90k catalog; arrow keys and Enter choose one, Escape closes the list
- [ ] #2 Focusing the empty search field shows the last 5 searches from this browser, with a control that clears them; nothing about them leaves the browser
- [ ] #3 The suggest endpoint is documented in OpenAPI with Swagger and covered by tests; without JavaScript the search form works as before
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
