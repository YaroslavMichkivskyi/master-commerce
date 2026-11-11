---
id: TASK-26
title: 'Web: Cypress tests (component and end-to-end)'
status: To Do
assignee: []
created_date: '2026-11-11T18:50:00Z'
labels:
  - post-mvp
  - no-spec
  - web
dependencies:
  - TASK-20
priority: low
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add Cypress next to the Playwright end-to-end suite of TASK-14, to cover React components in isolation and to compare both tools on this codebase.

Scope:
- Cypress component tests for the main storefront components (product card, filters, cart)
- a few end-to-end journeys in Cypress; a written comparison with Playwright (speed, flakiness, DX, CI cost)
- runs in CI on PRs touching web
- ADR on which tool covers what, docs/technologies.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Component tests cover the main storefront components
- [ ] #2 Cypress runs in CI on PRs touching web
- [ ] #3 The Cypress vs Playwright comparison is recorded in the task notes and an ADR
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
