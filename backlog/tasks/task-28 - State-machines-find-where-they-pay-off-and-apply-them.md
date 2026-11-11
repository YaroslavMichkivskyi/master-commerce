---
id: TASK-28
title: 'State machines: find where they pay off and apply them'
status: To Do
assignee: []
created_date: '2026-11-11T18:50:00Z'
labels:
  - post-mvp
  - no-spec
  - backend
dependencies:
  - TASK-20
priority: low
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Explicit state machines instead of scattered status checks where an entity or a flow has real states and transitions.

Scope:
- review candidates: order lifecycle (placed, confirmed, cancelled, shipped…), the stock-reservation saga, checkout steps in web, payment stub states
- choose a tool (XState or a small typed transition table; compare) and apply it where it simplifies code
- invalid transitions are rejected and tested; transitions can be visualised for docs
- ADR, docs/technologies.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Candidate places are reviewed and the choice is recorded in an ADR
- [ ] #2 At least the order lifecycle runs on an explicit state machine with tests for invalid transitions
- [ ] #3 The state diagram is in the docs
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
