---
id: TASK-3
title: 'Service chassis: config, logs, health, metrics, errors, OpenAPI'
status: In Progress
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-12T22:47:00Z'
labels:
  - mvp
  - speckit-light
  - backend
dependencies:
  - TASK-2
priority: medium
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A shared base so every service behaves the same operationally.

Scope:
- `packages/service-chassis`: a base NestJS module: env config validation, structured logs (pino) with correlation id propagated by the gateway, `/health` (liveness / readiness), `/metrics` (Prometheus), one error format (RFC 9457 Problem Details), OpenAPI from code, graceful shutdown
- the TASK-2 services moved onto the chassis

Spec: `specs/003-service-chassis/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every service exposes the same health, metrics, error format and OpenAPI
- [ ] #2 A new service adopts the chassis with one module import and the chassis bootstrap call
- [ ] #3 A request's correlation id appears in the logs of gateway and service
- [ ] #4 Swagger UI at /docs shows every endpoint with schemas, status codes and auth (ADR 0014)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-light: spec specs/003-service-chassis -> plan -> tasks -> implement
<!-- SECTION:PLAN:END -->
