---
name: start-task
description: Start a backlog task: pick TASK-N, cut branch task-N (bug-N for bugs) from dev, mark it In Progress, choose spec-kit or direct path. Use before any change to the repo.
argument-hint: "[Task number (optional)]"
---

Read `docs/playbooks/start-task.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write (code, docs, task text, commits, PR) is English.
- Branches are `task-<N>` / `bug-<N>` from `dev`; `<N>` is the Backlog.md task number, never invented.
- Push, PR, merge and tags only after the owner approves the exact payload.
