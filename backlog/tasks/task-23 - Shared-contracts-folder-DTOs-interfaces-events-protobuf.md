---
id: TASK-23
title: 'Shared contracts folder: DTOs, interfaces, events, protobuf'
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T15:54:00Z'
updated_date: '2026-11-08T16:06:00Z'
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
- [x] #1 ADR records the shared/ layout and the rules for what goes there
- [x] #2 mvp-plan, AGENTS map, TASK-2 and TASK-8 refer to shared/ instead of packages/contracts
- [x] #3 shared/README.md describes each subfolder
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ADR 0016: top-level shared/ with shared/dto (DTOs, interfaces, enums), shared/events (replaces packages/contracts), shared/proto (reserved; gRPC needs its own ADR). shared/README.md with the rules; mvp-plan layout and workspaces, AGENTS map, roadmap, TASK-2 / TASK-8, technologies.md updated; ADR 0006 status notes the move. Docs only, packages are created by TASK-2.
<!-- SECTION:FINAL_SUMMARY:END -->
