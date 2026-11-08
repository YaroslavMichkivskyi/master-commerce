---
id: TASK-20
title: 'MVP freeze: review, runbook, merge to main, tag mvp-v1'
status: To Do
assignee: []
created_date: '2026-11-08T14:39:00Z'
labels:
  - mvp
  - no-spec
  - process
dependencies:
  - TASK-2
  - TASK-3
  - TASK-4
  - TASK-5
  - TASK-6
  - TASK-7
  - TASK-8
  - TASK-9
  - TASK-10
  - TASK-11
  - TASK-12
  - TASK-13
  - TASK-14
  - TASK-15
  - TASK-16
  - TASK-17
  - TASK-18
  - TASK-19
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The finished MVP; follow-up work branches from this tag.

Scope:
- review of tech debt; README and runbook (start, deploy, reset data)
- merge dev -> main, tag `mvp-v1`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The runbook lets a fresh machine start the shop
- [ ] #2 `main` carries the `mvp-v1` tag
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
