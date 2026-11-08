---
id: TASK-18
title: 'SEO automation: on-demand ISR and sitemap Lambda'
status: To Do
assignee: []
created_date: '2026-11-08T14:39:00Z'
labels:
  - mvp
  - speckit-light
  - web
  - cloud
dependencies:
  - TASK-6
  - TASK-17
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- Lambda `revalidate` on `product.changed` -> on-demand ISR in Next
- Lambda `sitemap` on a schedule (EventBridge Scheduler) -> `sitemap.xml` in S3, served from the domain

Spec: `specs/018-seo-automation/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A price change shows on the product page without a rebuild
- [ ] #2 The sitemap lists every published product
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
