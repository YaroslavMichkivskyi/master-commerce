---
id: TASK-17
title: 'Cloud bridge: events to SQS, notify e-mails'
status: To Do
assignee: []
created_date: '2026-11-08T14:39:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-full
  - events
  - cloud
dependencies:
  - TASK-11
  - TASK-15
priority: medium
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- `cloud-bridge`: selected RabbitMQ events -> AWS SQS (off locally by a flag)
- Lambda `notify`: e-mails via SES (sign-up, order confirmed / shipped); locally Mailpit; e-mail templates

Spec: `specs/017-cloud-bridge/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Locally the e-mail is visible in Mailpit
- [ ] #2 In the cloud the e-mail arrives in a real inbox
- [ ] #3 With the bridge off nothing leaves the local stack
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
