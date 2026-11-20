---
id: TASK-5
title: 'Data generator: deterministic, skewed hardware catalog'
status: In Progress
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-20T23:38:00Z'
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
- [ ] #1 The same seed produces the same data hash
- [ ] #2 100K products load in under 2 minutes locally
- [ ] #3 Generated products pass the TASK-4 spec validation
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
<!-- SECTION:NOTES:END -->
