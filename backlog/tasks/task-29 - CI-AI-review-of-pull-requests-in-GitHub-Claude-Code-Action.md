---
id: TASK-29
title: 'CI: AI review of pull requests in GitHub (Claude Code Action)'
status: To Do
assignee: []
created_date: '2026-11-12T00:25:00Z'
updated_date: '2026-11-12T00:26:00Z'
labels:
  - no-spec
  - infra
  - quality
dependencies:
  - TASK-2
priority: low
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run an AI code review inside GitHub on pull requests, in addition to the local review before every PR (close-task step 4).

Scope:
- anthropics/claude-code-action in a workflow; triggered by a label (e.g. ai-review) or an @claude comment, not on every push
- auth: API key (pay per token) vs subscription OAuth token (claude setup-token); compare cost and limits, store as a repository secret
- review comments posted on the PR; the review never blocks the merge
- Actions minutes impact on the private repo checked
- prompt / rules for the reviewer kept in the repo (focus: correctness, AGENTS.md rules, OpenAPI completeness)
- alternative considered: GitHub Copilot code review
- ADR, docs/technologies.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A labelled PR gets AI review comments from the workflow
- [ ] #2 The secret is stored only as a repository secret; nothing in the repo
- [ ] #3 The choice of auth and its cost are recorded in an ADR
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
