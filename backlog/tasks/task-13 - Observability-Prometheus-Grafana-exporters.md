---
id: TASK-13
title: 'Observability: Prometheus, Grafana, exporters'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-light
  - infra
  - quality
dependencies:
  - TASK-3
priority: medium
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- Prometheus, Grafana (dashboards: service RED metrics, Postgres, RabbitMQ, containers), cAdvisor, postgres_exporter; Compose profile `monitoring`
- dashboards grow with later slices

Spec: `specs/013-observability/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One command starts monitoring
- [ ] #2 Dashboards show live load of services, Postgres and RabbitMQ
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
