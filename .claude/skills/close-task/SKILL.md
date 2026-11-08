---
name: close-task
description: Finish a backlog task: verify every acceptance criterion with evidence, close the task in its branch, push task-N / bug-N and open a PR to dev after the owner's approval.
argument-hint: "[Task number (optional)]"
---

Read `docs/playbooks/close-task.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write (code, docs, task text, commits, PR) is English.
- Branches are `task-<N>` / `bug-<N>` from `dev`; `<N>` is the Backlog.md task number, never invented.
- Push, PR, merge and tags only after the owner approves the exact payload.
