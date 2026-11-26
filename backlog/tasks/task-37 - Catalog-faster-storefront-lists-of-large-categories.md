---
id: TASK-37
title: 'Catalog: faster storefront lists of large categories'
status: To Do
assignee: []
created_date: '2026-11-26T23:26:00Z'
labels:
  - mvp
  - speckit-light
  - backend
  - data
dependencies:
  - TASK-6
priority: medium
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: storefront lists stay well inside NFR-001 of TASK-6 (P95 <= 200 ms) for large inner categories and keep it as the catalog grows, so the k6 load tests of TASK-14 and a 1 000 000-product catalog do not fail on them.

Context (TASK-6 T012 notes): with 100 000 products the list P95 is 175.5 ms, but the unfiltered Components list (38 664 products) alone has P95 ~265 ms; the cost grows with the number of products in scope, since the one-statement list (list-query.ts) materialises every product of the scope with its whole specs JSON and counts every facet over it.

Scope:
- Measure first: EXPLAIN (ANALYZE, BUFFERS) of the slow lists at 100 000 and 1 000 000 products; record where the time goes.
- Candidates, chosen by measurement: carry only the columns the list needs through the CTEs (specs read for the page rows only; facet attribute values extracted once), indexes that serve the default sorts within a category, counts of unfiltered scopes kept or cached, PostgreSQL settings of the catalog database (work_mem, parallel workers) in Compose.
- The facet counts stay exact (brute-force integration tests of TASK-6 stay green); no new infrastructure.
- test:nfr extended with a 1 000 000-product run (NFR_PRODUCTS) and a per-query P95 limit for the largest categories.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every list query of test:nfr, the Components list included, has P95 <= 200 ms at 100 000 products
- [ ] #2 At 1 000 000 products the list P95 of test:nfr is measured and recorded, and searches stay within 300 ms
- [ ] #3 The TASK-6 integration tests (facet counts against brute force, sorts, paging) stay green; the change and its measurements are recorded (research / ADR if a lasting decision)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
