---
name: run-speckit
description: Take a speckit-full / speckit-light backlog task through spec-kit (specify, clarify, plan, tasks, implement) with the spec folder numbered after the task and review gates.
argument-hint: "[Task number]"
---

Read `docs/playbooks/speckit-run.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write (code, docs, task text, commits, PR) is English.
- Branches are `task-<N>` / `bug-<N>` from `dev`; `<N>` is the Backlog.md task number, never invented.
- Push, PR, merge and tags only after the owner approves the exact payload.
