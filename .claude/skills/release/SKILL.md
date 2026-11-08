---
name: release
description: Release stable work from dev to main via a PR and tag a version (incl. mvp-v1).
argument-hint: "[Release summary]"
---

Read `docs/playbooks/release.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write (code, docs, task text, commits, PR) is English.
- Branches are `task-<N>` / `bug-<N>` from `dev`; `<N>` is the Backlog.md task number, never invented.
- Push, PR, merge and tags only after the owner approves the exact payload.
