---
id: TASK-1
title: 'Process foundation: spec-kit, constitution, ADRs, backlog, playbooks'
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-08T14:44:00Z'
labels:
  - mvp
  - no-spec
  - process
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the development process once, before any code.

Scope:
- spec-kit 0.14.1 vendored in the repo root, co2-style spec template override
- `.specify/memory/constitution.md` from mvp-plan.md §2 and AGENTS.md
- `docs/adr/` with the template and ADR 0001-0013
- Backlog.md initialised; roadmap tasks created
- `docs/playbooks/` + thin skills in `.claude/skills/`; PR template; English-only rule
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 spec-kit skills are available and the engine scripts resolve paths
- [x] #2 Constitution v1.0.0 and ADR 0001-0013 are accepted
- [x] #3 Backlog holds the numbered roadmap tasks
- [x] #4 start-task / close-task playbooks and the PR template exist
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bootstrap of the process, done directly on dev before the task-branch rule existed. spec-kit 0.14.1 vendored with a co2-style spec template override; constitution v1.0.0; ADR 0001-0013; Backlog.md with the 20 roadmap tasks; playbooks create/start/close-task, speckit-run, write-adr, release with thin skills; PR template. Verified: create-new-feature.sh dry-run resolves specs/002-walking-skeleton. No code yet, so no tests (DoD 2 n/a); no PR (DoD 4 n/a, bootstrap).
<!-- SECTION:FINAL_SUMMARY:END -->
