---
id: TASK-8
title: 'Messaging: event contracts, outbox / inbox, RabbitMQ topology'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
labels:
  - mvp
  - speckit-light
  - events
dependencies:
  - TASK-3
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reliable events between services (ADR 0006).

Scope:
- `packages/contracts` (versioned event types), `packages/outbox`: outbox table + relay, publishing to RabbitMQ; inbox table for consumer idempotency; retries with backoff, dead-letter queue; exchange / queue topology as code
- a demo `product.changed` event from catalog-service

Spec: `specs/008-messaging/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No event is lost when the broker or the service crashes (integration test)
- [ ] #2 A redelivered event is not applied twice
- [ ] #3 Poison messages end up in the dead-letter queue
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
