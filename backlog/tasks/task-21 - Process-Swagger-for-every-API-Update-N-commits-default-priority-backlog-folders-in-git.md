---
id: TASK-21
title: >-
  Process: Swagger for every API, Update #N commits, default priority, backlog
  folders in git
status: To Do
assignee: []
created_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - no-spec
  - process
dependencies: []
priority: medium
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Process changes requested by the owner on 2026-11-08.

Scope:
- every HTTP API is documented with OpenAPI and served with Swagger UI (rule, ADR, constitution gate, playbooks, PR template, TASK-3)
- commit type `Update #<N>: <msg>` for backlog-only changes, committed directly on dev without a branch
- default priority Medium for every task
- empty backlog folders kept in git (.gitkeep)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rules, ADRs, constitution and playbooks describe Swagger and the Update commit
- [ ] #2 All tasks have a priority; create-task sets Medium by default
- [ ] #3 A fresh clone has every backlog folder
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
