---
id: TASK-4
title: 'Catalog model: brands, categories, attributes, products, admin API'
status: In Progress
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-20T14:59:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - data
dependencies:
  - TASK-3
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The core of the catalog database, the busiest data of the shop.

Scope:
- brands, category tree, category attribute schemas (socket, memory size, ...)
- products: price, stock, specs (JSONB validated by the category schema), publication, soft delete, audit columns
- admin CRUD API (unauthenticated until TASK-7), Drizzle migrations

Spec: `specs/004-catalog-model/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A 'Graphics cards' category with attributes and a product with valid specs can be created via the API
- [ ] #2 Specs that violate the category schema are rejected with a Problem Details error
- [ ] #3 Migrations apply from scratch and are covered by integration tests
- [ ] #4 The database enforces what the shared DTOs validate (CHECK constraints for name length, slug format, …), so a row the API would reject cannot be stored; writes are validated before they reach the database
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-full: spec specs/004-catalog-model -> clarify -> plan -> tasks -> implement
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From the AI review of TASK-2: the category table has plain text columns while CategoryDto limits name length and slug format; one bad row makes the gateway reject the whole list with 502.

Verification (2026-11-20, Windows 11, Node 24, Docker Desktop):
- Full checks: format:check; turbo run lint typecheck test test:integration build --force — 21/21. catalog-service: 72 unit, 108 integration (+1 on demand); api-gateway: 19 unit, 60 integration.
- Fresh clone of task-4: pnpm install --frozen-lockfile, the same checks — 21/21.
- Quickstart (specs/004-catalog-model/quickstart.md) on the local stack through the gateway: scenarios 1-8 answered as written; pnpm dev applied the new migrations to the existing TASK-2/3 database (upgrade path). Scenario 9 (pnpm reset) not run on the owner's data; the schema from scratch is covered by every integration test (Testcontainers, real migrations).
- NFR-001 (test/nfr-001.int.test.ts, NFR_001=1): 100 220 products, 200 sequential HTTP writes each — create median 8.9 ms (p95 11.6), update median 8.4 ms (p95 10.6); limit 50 ms.
- The note above (bad rows breaking the public list) is resolved: names, slugs and lengths are CHECK constraints now (US-4).
<!-- SECTION:NOTES:END -->
