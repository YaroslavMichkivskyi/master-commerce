---
id: TASK-5
title: 'Data generator: deterministic, skewed hardware catalog'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
labels:
  - mvp
  - speckit-light
  - data
dependencies:
  - TASK-4
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
