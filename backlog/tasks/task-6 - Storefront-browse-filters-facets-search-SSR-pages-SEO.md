---
id: TASK-6
title: 'Storefront browse: filters, facets, search, SSR pages, SEO'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - web
dependencies:
  - TASK-5
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Customers can find products, and search engines can index them.

Scope:
- API: category listing with spec / brand / price / stock filters, facet counts, sorting, pagination; PostgreSQL FTS search
- web: home, category page with filters in the URL, product page (SSR / ISR), search; metadata, canonical, JSON-LD Product, robots.txt, basic sitemap

Spec: `specs/006-storefront-browse/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On 100K products, filter + sort answers with P95 < 200 ms locally
- [ ] #2 A product page is served as complete HTML with JSON-LD
- [ ] #3 Filter state survives reload and sharing via the URL
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
