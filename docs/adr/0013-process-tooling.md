# 0013. Process tooling: spec-kit for specs, Backlog.md for tasks

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

Most code will be written with coding agents. Large features need a spec → plan → tasks flow; the owner needs a numbered, file-based backlog that agents can read and update.

## Considered options

- Plain agent plan mode only
- OpenSpec
- BMAD
- GitHub Issues as the backlog
- spec-kit + Backlog.md

## Decision

spec-kit 0.14.1 vendored in the repo root (`.specify/`, skills in `.claude/skills/`), spec template overridden in `.specify/templates/overrides/`; features in `specs/<NNN>-<name>/` where `NNN` is the task number. Backlog.md (`backlog/`) holds the numbered tasks; one task = one branch = one PR. Roadmap tasks carry a `speckit-full`, `speckit-light` or `no-spec` label (`docs/roadmap.md`).

## Consequences

- Specs, tasks and code live together in git and are reviewed in the same PR.
- spec-kit feature resolution uses `.specify/feature.json`, so branch names stay free.
- Two tools to keep in sync: the backlog task is the unit of work, the spec its detail.
