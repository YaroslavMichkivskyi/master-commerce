---
id: TASK-5
title: 'Data generator: deterministic, skewed hardware catalog'
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-20T23:53:00Z'
labels:
  - mvp
  - speckit-light
  - data
dependencies:
  - TASK-4
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Realistic data for demos and load tests.

Scope:
- `tools/datagen`: deterministic by seed; plausible brands / lines / models / specs of computer hardware
- skew (Zipf: many products from few brands); scales 1K / 100K / 1M; fast load via `COPY`

Spec: `specs/005-datagen/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The same seed produces the same data hash
- [x] #2 100K products load in under 2 minutes locally
- [x] #3 Generated products pass the TASK-4 spec validation
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-light: spec specs/005-datagen -> plan -> tasks -> implement
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verification (2026-11-21, Windows 11, Docker Desktop):
- Full checks: format:check; turbo run lint typecheck test test:integration build --force — 25/25. datagen: 50 unit tests; catalog-service: 130 integration (8 for datagen against the real catalog).
- Fresh clone of task-5: pnpm install --frozen-lockfile, the same checks — 25/25.
- Determinism: seed demo, 1 000 products → hash a2986c3d… on Windows (Node 22.18) and on Linux (node:24-alpine, Node 24.22, TZ Asia/Tokyo, LANG de_DE); the unit test pins it, so CI checks it again.
- NFR-001: 100 000 products generated and loaded in 6.4 s (8.0 s with the build), peak memory 74 MB; limit 2 min.
- NFR-002: 1 000 000 products in 58.7 s, peak memory 108 MB (limit 512 MB); product table 830 MB.
- Both runs used a throwaway database catalog_bench in the local postgres-catalog container (migrated with db:migrate, dropped afterwards), so the local catalog stayed as it was. The refusal without --reset was seen there too.

AI review (Claude Code /code-review, high, branch vs origin/dev): 10 findings, each checked against the code.
- Fixed: sub-streams were seeded from a 32-bit FNV-1a hash of the key, so some product keys shared a stream (seed 42: 124 pairs in 1M products, e.g. product 90054 and 572040; seed demo had none) — the 128-bit sfc32 state now comes from SHA-256 of the key, with a test that fails on the old seeding. The pg row of docs/technologies.md names its new place (tools/datagen). A catalog test now refuses a name spec that may be missing (required or fixed by every model).
- After the fix the pinned hash of seed demo, 1 000 products is f627cfb5… (it replaces a2986c3d… above) — the same on Windows and on Linux (node:24-alpine, TZ Asia/Tokyo, de_DE). NFR re-measured in a throwaway catalog_bench: 100 000 products 6.1 s, 74 MB; 1 000 000 products 62.4 s, 110 MB.
- Left as is: no error listener on the CSV write stream (only a wrong --out path; the process dies, the load rolls back); the URL described after the commit (connection strings here are always postgres:// URLs); partial CSV files after a failed load; --zipf Infinity printed with a stack (odd input); the hash loop in output() next to dataHash() (a test asserts they agree); per-line async iteration (within both NFR); the copied tier spread formula (quality).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
New tool tools/datagen (pnpm datagen): fills the catalog database with a realistic computer-hardware catalog of any size — 27 categories (21 leaves) with attributes of all five types, some inherited; 51 brands with their product lines; products with names, specs consistent per model, prices that grow with the specs, stock and publication. The same seed gives the same catalog byte for byte (SHA-256 over the rows, 128-bit seeded sfc32 streams, no clock / locale / time zone); products per brand follow Zipf (1.1 by default). Rows stream into COPY in one transaction as the owner: a catalog with brands or products is refused unless --reset; a failed load leaves the database as it was; --out writes the same rows as CSV, --no-load only hashes.

Verified: format, lint, typecheck, unit (datagen 51) and integration tests (catalog-service 130, 8 for datagen: the catalog's own validateSpecs on every generated product, the service as catalog_app on the loaded data), build --force; fresh clone; pinned hash f627cfb5… on Windows and Linux; 100 000 products in 6.1 s, 1 000 000 in 62.4 s with 110 MB; AI review with 3 fixes.

Risks: a change of the catalog description or the generator changes every generated catalog (the pinned hash test makes that visible); --reset replaces the whole local catalog, as documented.
<!-- SECTION:FINAL_SUMMARY:END -->
