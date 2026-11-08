---
id: TASK-14
title: 'Quality gates: e2e, contract tests, k6 smoke, Lighthouse'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-light
  - quality
dependencies:
  - TASK-11
  - TASK-12
priority: medium
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The end-to-end regression suite.

Scope:
- Playwright e2e of the customer and admin journeys
- contract tests by OpenAPI between web / gateway / services
- workflows `integration` (service containers), `nightly-smoke` (short k6), `lighthouse`

Spec: `specs/014-quality-gates/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All checks run in CI
- [ ] #2 A failing e2e test blocks merging to main
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
