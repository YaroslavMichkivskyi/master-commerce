---
id: TASK-6
title: 'Storefront browse: filters, facets, search, SSR pages, SEO'
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-27T00:50:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - web
dependencies:
  - TASK-5
priority: medium
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Customers can find products, and search engines can index them.

Scope:
- API: category listing with spec / brand / price / stock filters, facet counts, sorting, pagination; PostgreSQL FTS search
- web: home, category page with filters in the URL, product page (SSR / ISR), search; metadata, canonical, JSON-LD Product, robots.txt, basic sitemap
- old slugs of products, categories and brands (kept by TASK-4) answer a 301 redirect to the current URL

Spec: `specs/006-storefront-browse/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On 100K products, filter + sort answers with P95 < 200 ms locally
- [x] #2 A product page is served as complete HTML with JSON-LD
- [x] #3 Filter state survives reload and sharing via the URL
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [x] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-full: spec specs/006-storefront-browse -> clarify -> plan -> tasks -> implement
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Speed, measured 2026-11-27 (T012, `pnpm --filter catalog-service test:nfr`: fresh PostgreSQL 17.11, 100 000 products of seed demo, 15 timed runs per query after 3 warm-up runs, in-process HTTP on Windows 11):
- Category lists (5 categories x 5 queries: unfiltered, sorted, two brands, brand + attribute + price + stock, page 40): P95 175.5 ms (NFR-001 <= 200 ms); the slowest query is the unfiltered Components list (38 664 products, inner category), P95 ~265 ms on its own.
- Searches (10 queries, plain and filtered + sorted): P95 36.1 ms (NFR-002 <= 300 ms). With ts_rank_cd it was 310 ms (gaming laptop: 7 906 matches, ranking ~260 ms of it); switched to ts_rank (research R-4).
- Data generator with the search triggers: 100 000 products 16.4-17.2 s (was 6.1 s before the triggers; NFR-001 of TASK-5 < 120 s), 1 000 000 products 177.6 s, peak memory 111 MB.
- Full checks (format:check, turbo lint typecheck test test:integration build --force): 25/25; fresh clone of task-6 on Windows: install + lint typecheck test build 23/23.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Storefront browse: a public read-only catalog API (tree with counts, category and brand lists with disjunctive facets, full-text search ranked by ts_rank with a prefix last word, product by slug with former slugs, newest, sitemap) forwarded by the gateway under /api/v1/catalog; server-rendered pages with filters, sort and page in the address, 308 for old slugs, refused filters dropped while the rest stay, 500 with an unavailable page; SEO (metadata, canonical / noindex rules, Product and BreadcrumbList JSON-LD, robots.txt, sitemap in parts of 50 000). Search document kept by triggers (ADR 0023). Verified: turbo lint typecheck test test:integration build 25/25, fresh clone 23/23, test:nfr at 100 000 products - lists P95 179.9 ms, searches P95 37.7 ms; 29/29 test cases pass on the running stack; AI review (/code-review) findings fixed or recorded in the PR. Risks: large inner categories near the list target (TASK-37); stricter admin attribute validation for legacy rows.
<!-- SECTION:FINAL_SUMMARY:END -->
