# 0015. Backlog-only changes are committed directly on dev as `Update #N`

- Status: superseded by [0017](0017-commit-merge-and-review-conventions.md); backlog-only commits are now `chore(backlog): …`
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

ADR 0012 sends every change through a `task-<N>` / `bug-<N>` branch and a PR. Adding a
task, changing its priority, rewording acceptance criteria or archiving it touches only
`backlog/` and carries no risk for the build; a branch and a PR for each such edit is
pure overhead and slows down planning.

## Considered options

- Keep everything behind PRs
- Let backlog edits ride along in the next task branch
- Commit backlog-only changes directly on `dev` with a dedicated commit type

## Decision

A commit that changes **only files under `backlog/`** (create, edit, re-prioritise,
archive, delete tasks; backlog config) is made directly on `dev`, without a branch or a
PR, with the title:

```
Update #<N>: <what changed>
```

`<N>` is the task number (`TASK-<N>`); several tasks → `Update #3, #7: …`, a range →
`Update #1-#20: …`. Pushing it still needs the owner's approval.

Task status changes that belong to the work itself (`In Progress` at the start, `Done`
with the final summary at the end) stay in the task branch, as `docs/playbooks/start-task.md`
and `close-task.md` say. A commit that touches anything outside `backlog/` is never an
`Update` commit.

## Consequences

- Planning is fast and its history is easy to filter (`git log --grep '^Update #'`).
- `Update` titles are not Conventional Commits, so release-please ignores them —
  intended: backlog edits are not releasable changes.
- Pull `dev` before branching so task branches include the latest backlog.
