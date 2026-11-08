---
id: TASK-22
title: Research and add security and quality scanners
status: To Do
assignee: []
created_date: '2026-11-08T15:54:00Z'
labels:
  - mvp
  - no-spec
  - quality
dependencies:
  - TASK-2
priority: low
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Study how each tool works, compare them on this repo and wire the chosen ones into CI.

Candidates:
- Trivy - dependencies, Docker images, IaC (CDK / CloudFormation), secrets, SBOM
- SonarQube Cloud - static analysis (SAST), code quality, coverage, PR quality gate
- Snyk - dependencies (SCA), code, containers, IaC
- Dependabot - dependency alerts and update PRs
- OWASP - ZAP baseline scan of the running app (DAST) and / or Dependency-Check
- dependency-cruiser - module dependency rules (architecture boundaries, cycles), not a vulnerability scanner

Notes: check free-plan limits for a private repo (Sonar LOC limit, Snyk test quota); avoid duplicate SCA alerts between Trivy, Snyk and Dependabot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each candidate tried on the repo; findings and free-plan limits recorded in task notes
- [ ] #2 Chosen tools run in GitHub Actions with a documented fail threshold
- [ ] #3 docs/technologies.md and an ADR record what was chosen and why
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
