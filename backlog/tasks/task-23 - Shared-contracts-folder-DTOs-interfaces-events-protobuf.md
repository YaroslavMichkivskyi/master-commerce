---
id: TASK-23
title: 'Shared contracts folder: DTOs, interfaces, events, protobuf'
status: To Do
assignee: []
created_date: '2026-11-08T15:54:00Z'
labels:
  - mvp
  - no-spec
  - process
dependencies: []
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Top-level shared/ folder for contracts shared by services and web, so types are defined once.

Scope (documentation now, packages are created by TASK-2):
- shared/dto - request / response DTOs (class-validator + @nestjs/swagger decorators) and shared interfaces
- shared/events - versioned event envelopes and payloads (replaces packages/contracts)
- shared/proto - Protocol Buffers (.proto) for gRPC, if gRPC is adopted; TypeScript generated from them
- ADR, mvp-plan layout, roadmap and technologies updated
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ADR records the shared/ layout and the rules for what goes there
- [ ] #2 mvp-plan, AGENTS map, TASK-2 and TASK-8 refer to shared/ instead of packages/contracts
- [ ] #3 shared/README.md describes each subfolder
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
