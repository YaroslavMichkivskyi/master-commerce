---
id: TASK-21
title: >-
  Process: Swagger for every API, Update #N commits, default priority, backlog
  folders in git
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T15:32:00Z'
updated_date: '2026-11-08T15:36:00Z'
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
- [x] #1 Rules, ADRs, constitution and playbooks describe Swagger and the Update commit
- [x] #2 All tasks have a priority; create-task sets Medium by default
- [x] #3 A fresh clone has every backlog folder
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Rules + ADR 0014 (Swagger) + ADR 0015 (Update commits) + constitution + playbooks + PR template + TASK-3 AC + technologies.md + .gitkeep
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ADR 0014 (OpenAPI + Swagger UI for every HTTP API) and ADR 0015 (backlog-only Update #N commits on dev, amends 0012); rules in AGENTS.md, constitution v1.1.0, spec template checklist, create/start/close-task playbooks, PR template, technologies.md; TASK-3 got a Swagger AC; all tasks priority medium (commit Update #1-#20); .gitkeep in archive/decisions/docs/drafts/milestones. Verified: backlog task list shows priorities, git ls-files lists the .gitkeep files. No code, so no tests (DoD 2 n/a).
<!-- SECTION:FINAL_SUMMARY:END -->
