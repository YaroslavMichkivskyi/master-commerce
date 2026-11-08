---
name: write-adr
description: Record an architecture decision as a MADR file in docs/adr/. Use when a decision outlives the current task or a feature plan holds one.
argument-hint: "[Decision to record]"
---

Read `docs/playbooks/write-adr.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write (code, docs, task text, commits, PR) is English.
- Branches are `task-<N>` / `bug-<N>` from `dev`; `<N>` is the Backlog.md task number, never invented.
- Push, PR, merge and tags only after the owner approves the exact payload.
