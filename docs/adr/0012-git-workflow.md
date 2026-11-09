# 0012. Git workflow: dev → main, task / bug branches, PRs, tags

- Status: accepted; amended by [0015](0015-backlog-update-commits-on-dev.md), [0017](0017-commit-merge-and-review-conventions.md) (merge commits instead of squash, commit format, per-commit review)
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

One developer plus coding agents need a predictable flow that keeps `main` stable and every change reviewable and traceable to a task.

## Considered options

- Trunk-based on main
- GitFlow
- dev → main with short task branches

## Decision

`dev` is the integration branch, `main` holds stable parts only (merged from `dev`). Every backlog task gets a branch from `dev`: `task-<N>`, or `bug-<N>` for a bug, where `<N>` is the Backlog.md task number. Changes reach `dev` only through a PR (squash merge) whose title is a Conventional Commit with the task id, e.g. `feat(catalog): product attributes (TASK-4)`. Releases are tagged `v<semver>`; the finished MVP is the `mvp-v1` tag, follow-up work branches from it. Procedures: `docs/playbooks/start-task.md`, `close-task.md`.

## Consequences

- Every change is linked to a task, a branch and a PR.
- Conventional Commits allow release-please on `main`.
- Branch names do not carry the feature name — the spec folder does.
