# master-commerce Constitution

Governing principles for spec-kit-driven work in this repository. These are the gates
the `speckit-plan` phase checks against. Day-to-day rules live in `AGENTS.md`,
`docs/playbooks/` and the ADRs (`docs/adr/`); this document never overrides them.

## Core Principles

### I. The MVP is an ordinary shop
The MVP is a real B2C computer-hardware shop written as a real team would write it:
no speculative features and no "extension points" for things that are not planned
(`docs/mvp-plan.md` §2). A plan that adds one fails the gate.

### II. Specs are the source of truth
The feature `spec.md` defines WHAT and WHY; `plan.md`, `tasks.md` and the code define
HOW. Do not silently contradict a spec: if it is wrong, flag it and update it first.

### III. Local first, explicit data access
- The catalog database (`catalog-service`) carries the real load of the shop:
  storefront reads, price / stock edits, reservations — keep it realistic.
- Everything runs locally in Docker Compose; cloud parts (Lambda, S3, SES, SQS) do
  asynchronous side work only, never serve a user request, and are off by a flag
  locally.
- Data access via Drizzle ORM; hot-path queries may be hand-written SQL (ADR 0005).
- Data generation is deterministic by seed.

### IV. Tests ship with the change
Every slice adds unit, integration and API-contract tests for its behaviour; together
they form the regression suite. Tests run in CI and locally via Docker Compose. If the
stack cannot be started, say so — never report a fabricated green run.

### V. Observable and documented by default
Every service exposes `/health` and `/metrics`, logs structured JSON with a correlation
id and uses the shared service chassis once it exists (TASK-3). Every HTTP endpoint is
described in OpenAPI and visible in Swagger UI (ADR 0014).

### VI. No scope creep, decisions recorded
Implement the spec's requirements and its Out of Scope boundaries exactly. A decision
that outlives the feature (technology, pattern, convention) is recorded as an ADR in
`docs/adr/`, not buried in `plan.md`.

### VII. Git workflow and approval
Work happens on a task branch `task-<N>` (bug: `bug-<N>`) cut from `dev`, where `<N>`
is the Backlog.md task number — never invented. Every commit is a Conventional Commit
and is reviewed by the owner before it is made. The change reaches `dev` only through
a PR merged with a merge commit (`docs/playbooks/close-task.md`); only backlog-only
edits and the repo's own rules are committed directly on `dev` (ADR 0017). Push, PR
creation and merges need the owner's explicit approval.

## Quality Gates

- The plan maps every FR-xxx and US-x to concrete design and tasks; an unmapped
  requirement fails the gate.
- Ambiguities are resolved before planning (`speckit-clarify`) or recorded as explicit
  assumptions in `plan.md`.
- Versions of new dependencies and images are pinned; everything works on Windows,
  macOS and Linux.
- Every new or changed endpoint has its OpenAPI description (Swagger UI) in the plan and
  the tasks.
- A newly applied technology has its row in `docs/technologies.md`.
- Everything is written in English.

## Governance

This constitution supports `AGENTS.md` and the ADRs; on conflict they win, and the
conflict is fixed by amending this file (bump the version, note the date). Complexity
must be justified against Principles I and VI.

**Version**: 1.2.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-09
