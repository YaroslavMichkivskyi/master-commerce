---
id: TASK-16
title: 'Media: product images, presigned upload, thumbnails'
status: To Do
assignee: []
created_date: '2026-11-08T14:39:00Z'
labels:
  - mvp
  - speckit-light
  - backend
  - cloud
dependencies:
  - TASK-12
  - TASK-15
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scope:
- upload via presigned URL to S3 (locally MinIO), linked to a product
- thumbnails: locally a worker, in the cloud Lambda `thumbnails`; event `product.image_uploaded`

Spec: `specs/016-media/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An admin uploads a photo and the storefront shows its thumbnail
- [ ] #2 The original stays in the bucket
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
