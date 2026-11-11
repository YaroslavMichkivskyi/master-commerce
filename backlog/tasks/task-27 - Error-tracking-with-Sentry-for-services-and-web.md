---
id: TASK-27
title: Error tracking with Sentry for services and web
status: To Do
assignee: []
created_date: '2026-11-11T18:50:00Z'
labels:
  - post-mvp
  - no-spec
  - quality
dependencies:
  - TASK-20
priority: low
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Report unhandled errors and failed requests with context, beyond structured logs and Prometheus metrics.

Scope:
- Sentry SDK in the NestJS services, the gateway and Next.js (server and browser), Lambdas if useful
- release and environment tags, source maps uploaded from CI, correlation id attached to events
- personal data scrubbed before sending; off by a flag locally
- free-plan limits checked; alternative (self-hosted GlitchTip) considered
- ADR, docs/technologies.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An unhandled error in a service and in web shows up in Sentry with release, environment and correlation id
- [ ] #2 No personal data is sent; local runs send nothing unless enabled
- [ ] #3 Source maps make stack traces point at TypeScript
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
