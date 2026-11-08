# Feature Specification: [FEATURE NAME]

**Feature Branch**: `task-[N]` (bug: `bug-[N]`)
**Spec folder**: `specs/[NNN]-[short-name]/`
**Task**: TASK-[N] — `backlog/tasks/task-[N] - [Title].md`
**Mode**: speckit-full | speckit-light
**Status**: Draft
**Created**: [DATE]
**Input**: "$ARGUMENTS"

<!--
  Project overrides of the spec-kit spec template (docs/playbooks/speckit-run.md).
  - speckit-full: fill every section.
  - speckit-light (infrastructure, the "user" is a developer): replace "User Scenarios"
    with "Goal" (2-4 sentences) and keep Acceptance bullets under it; skip Edge Cases
    if there are none.
  - Write WHAT and WHY, never HOW (no libraries, file names or code here — that is
    plan.md). Requirements are testable; each one has a stable ID.
  - Everything in English.
-->

---

## Scope

[One paragraph: what this feature adds to the shop, for whom, and where its edges are.
Name the services / apps it touches (catalog-service, web, …).]

---

## User Scenarios

### US-1 — [Short title]
[One or two sentences: the journey and why it matters.]

**Acceptance**
- Given [state], when [action], then [observable outcome].
- Given [state], when [action], then [observable outcome].

### US-2 — [Short title]
**Acceptance**
- Given …, then …

### Edge Cases
- [Boundary / failure condition] → [expected behaviour].

---

## Functional Requirements

### [Area, e.g. API]
- **FR-001** The system MUST …
- **FR-002** The system MUST …

### [Area, e.g. Web]
- **FR-010** …

### Non-functional
- **NFR-001** [Performance / reliability / observability target, measurable.]

### Key Entities *(if data is involved)*
- **[Entity]** — what it represents, key attributes, relations (no column types).

---

## Out of Scope
- [Explicitly excluded behaviour, with the task that owns it if any, e.g. "auth — TASK-7".]

## Explicitly Not Restated Here
- [Rules that apply but live elsewhere: constitution, ADR-00NN, mvp-plan.md §N.]

## Assumptions
- [Reasonable defaults taken instead of asking.]

## Clarifications
<!-- Filled by /speckit-clarify: ### Session YYYY-MM-DD, then "- Q: … → A: …" -->

---

## Review & Acceptance Checklist
- [ ] No implementation details (languages, frameworks, APIs) in requirements
- [ ] Every requirement is testable and unambiguous; IDs are stable
- [ ] Every US has Given / then acceptance; edge cases listed
- [ ] Scope is bounded; Out of Scope names the owning task where relevant
- [ ] Matches the backlog task's acceptance criteria
- [ ] No speculative features or extension points (mvp-plan.md §2)
- [ ] Every new / changed endpoint is listed — it gets an OpenAPI description and Swagger UI (ADR 0014)
- [ ] No `[NEEDS CLARIFICATION]` markers remain
