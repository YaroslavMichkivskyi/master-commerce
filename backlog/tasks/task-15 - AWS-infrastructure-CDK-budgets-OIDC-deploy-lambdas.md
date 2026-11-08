---
id: TASK-15
title: 'AWS infrastructure: CDK, budgets, OIDC, deploy-lambdas'
status: To Do
assignee: []
created_date: '2026-11-08T14:39:00Z'
updated_date: '2026-11-08T15:32:00Z'
labels:
  - mvp
  - speckit-light
  - cloud
  - infra
dependencies:
  - TASK-2
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deliberately late: the AWS free-plan clock starts with the account (ADR 0010).

Scope:
- AWS CDK (TypeScript): buckets, SQS, Lambda, SES, EventBridge, IAM
- AWS Budgets with an alert; OIDC role for GitHub Actions; `deploy-lambdas` workflow

Spec: `specs/015-aws-infra/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `cdk deploy` runs from CI without long-lived keys
- [ ] #2 A budget with an alert is active
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
