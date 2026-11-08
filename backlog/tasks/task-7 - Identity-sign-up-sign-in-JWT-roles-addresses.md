---
id: TASK-7
title: 'Identity: sign-up, sign-in, JWT, roles, addresses'
status: To Do
assignee: []
created_date: '2026-11-08T14:38:00Z'
labels:
  - mvp
  - speckit-full
  - backend
  - web
dependencies:
  - TASK-3
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users and access control.

Scope:
- `identity-service`: sign-up, sign-in, JWT access + refresh (rotation, revocation), roles customer / admin, delivery addresses, argon2 hashing
- gateway: JWT check, roles on routes, rate limit on sign-in; the TASK-4 admin API requires admin
- web: sign-up, sign-in, sign-out, profile and addresses, protected pages

Spec: `specs/007-identity/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A customer signs up, signs in and sees the profile
- [ ] #2 The admin API without the admin role returns 403
- [ ] #3 A revoked refresh token cannot be used again
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
