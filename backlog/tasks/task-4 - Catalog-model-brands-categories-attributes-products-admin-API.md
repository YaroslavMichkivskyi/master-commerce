---
id: TASK-4
title: 'Catalog model: brands, categories, attributes, products, admin API'
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-20T22:34:00Z'
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
- [x] #1 A 'Graphics cards' category with attributes and a product with valid specs can be created via the API
- [x] #2 Specs that violate the category schema are rejected with a Problem Details error
- [x] #3 Migrations apply from scratch and are covered by integration tests
- [x] #4 The database enforces what the shared DTOs validate (CHECK constraints for name length, slug format, …), so a row the API would reject cannot be stored; writes are validated before they reach the database
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [x] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [x] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
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

AI review (Claude Code /code-review, high, branch vs origin/dev): 10 findings, each checked against the code.
- Fixed: null in an update reached NOT NULL columns as a 500 (now 400); the seed re-inserted a renamed seeded category under its old slug; a slug such as '..' turned a gateway by-slug lookup into the catalog's list (now 400); the catalog's OpenAPI of a category change missed one 409 cause.
- Left as is: gateway timeout on subtree checks (measured 158 ms for 50 220 products, the 2 s limit needs ~10x the MVP catalog); an old .env with the owner URL (the service refuses it with a message naming the fix, once); weak W/ ETags accepted in If-Match (on purpose, a compressing proxy weakens ETags; the reason is in versioning.ts); the privileged-role guard misses a member of the owner role (a misconfiguration net, not a security boundary); copied helpers and per-attribute statements (quality, no effect).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The catalog now has its model and an admin API: brands; a category tree of any depth whose categories define typed attributes (select, multi-select, number, boolean, text) inherited down the tree; products in leaf categories with euro prices in cents (VAT included), stock, publication and specs validated against the effective attributes on every write. Every entity has a UUIDv7 id, audit columns, soft delete with restore, a version used with ETag / If-Match (412 stale, 428 missing), cursor-paged lists and a slug history that keeps old links working. Rules of one row are database constraints; rules across rows are checked by the service under row and advisory locks; attribute changes and moves that would break stored products answer 409 with the count. The service runs as a least-privilege role (no DDL, no DELETE), migrations run apart with the owner. api-gateway exposes the 24 endpoints under /api/v1/admin/catalog and forwards them with the catalog's answers (ADR 0021); the data conventions are ADR 0022.

Verified: format, lint, typecheck, unit and integration tests (catalog 72 + 122, gateway 19 + 62, service-core 80), build --force; fresh clone; quickstart on the local stack, including the upgrade of an existing database; NFR-001 create / update median 8.9 / 8.4 ms with 100 220 products (limit 50 ms); AI review with 4 fixes.

Risks: the gateway is coupled to the catalog's paths (covered by a test of every route); admin endpoints are public until TASK-7; deleted rows are kept, purging is later work.
<!-- SECTION:FINAL_SUMMARY:END -->
