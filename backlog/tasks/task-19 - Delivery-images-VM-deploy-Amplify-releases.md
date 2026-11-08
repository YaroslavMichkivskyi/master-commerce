---
id: TASK-19
title: 'Delivery: images, VM deploy, Amplify, releases'
status: To Do
assignee: []
created_date: '2026-11-08T14:39:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-light
  - infra
  - cloud
dependencies:
  - TASK-14
  - TASK-15
priority: medium
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope (ADR 0011):
- images in GHCR + Trivy scan (`images` workflow)
- VM with Docker Compose (prod profile, TLS via Caddy), `deploy-app` workflow by tag
- `web` on Amplify, domain; release-please (versions, changelog)

Spec: `specs/019-delivery/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A `v0.x` tag deploys the application
- [ ] #2 The shop opens on its domain over HTTPS
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
