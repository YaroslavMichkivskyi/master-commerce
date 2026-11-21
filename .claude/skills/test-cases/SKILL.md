---
name: test-cases
description: Write a task's test-case table (specs/NNN-*/test-cases.md) or run it against the running stack and report PASS / FAIL / BLOCKED to test-reports/.
argument-hint: "[write | run] [Task number (optional)]"
---

Read `docs/playbooks/test-cases.md` first and follow it **exactly**: the playbook is the
source of truth, this skill only invokes it.

Input: $ARGUMENTS

Reminders that must not be skipped:
- Everything you write in the repo is English; the run report stays in the gitignored `test-reports/`.
- A run never fixes anything and never reports a result that did not happen.
