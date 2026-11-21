---
id: TASK-34
title: 'Edge protection: DDoS and bot mitigation in front of the public shop'
status: To Do
assignee: []
created_date: '2026-11-21T00:11:00Z'
labels:
  - mvp
  - speckit-light
  - infra
dependencies:
  - TASK-19
  - TASK-25
priority: medium
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: the deployed shop (TASK-19) stays reachable under floods and abusive bots. Volume attacks never reach the application, so they are stopped at the edge; the gateway's rate limits (TASK-25) handle what gets through.

Scope:
- The VM is reachable only through a DDoS-absorbing proxy (e.g. Cloudflare free plan as DNS proxy, compared with the AWS options in front of the VM); the firewall lets in only the proxy's addresses on 443, and SSH only by key from an allowlist.
- Basic WAF / bot rules at the edge: known bad bots challenged, abusive request rates per IP limited, the admin paths (/api/v1/admin) not cached and rate-limited harder.
- Caddy on the VM: request body size limits, read / header timeouts, connection limits, so slowloris-type traffic cannot tie up the services.
- web on Amplify is already behind CloudFront (AWS Shield Standard): document what it covers and what it does not.
- The real client IP passes through the proxy to the gateway (trusted proxy headers only from the proxy), so TASK-25's per-client limits and the logs see the client, not the proxy.
- Runbook: what to switch on under attack (proxy 'under attack' mode, stricter limits), how to see it (TASK-13 dashboards).
- ADR (edge protection), docs/technologies.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Only the edge proxy reaches the VM on 443; a direct request to the VM's address is refused
- [ ] #2 Edge rules limit request rates per client and challenge known bad bots; admin paths have stricter limits
- [ ] #3 Caddy enforces body size, timeouts and connection limits; a slow-request test cannot exhaust the services
- [ ] #4 The gateway sees the real client IP only via the trusted proxy, and the runbook says what to do under attack
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
