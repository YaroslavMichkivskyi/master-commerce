---
name: create-task
description: Add a numbered task or bug to the Backlog.md backlog. Use when new work or a bug appears that has no TASK-N yet.
argument-hint: "[Task / bug to add]"
---

Read `docs/playbooks/create-task.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write (code, docs, task text, commits, PR) is English.
- Branches are `task-<N>` / `bug-<N>` from `dev`; `<N>` is the Backlog.md task number, never invented.
- Push, PR, merge and tags only after the owner approves the exact payload.
