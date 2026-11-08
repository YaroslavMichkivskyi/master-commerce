# 0001. Record architecture decisions as ADRs

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

Decisions that shape the whole system (technologies, patterns, conventions) get made early and are forgotten or re-argued later; a reader of the code should find why it is the way it is. spec-kit's `plan.md` / `research.md` capture decisions per feature only.

## Considered options

- Keep decisions in feature `plan.md` files only
- A wiki / one big design document
- Architecture Decision Records in the repo

## Decision

Architecture Decision Records in the repo, MADR format, in `docs/adr/NNNN-title.md`, numbered sequentially. An accepted ADR is never rewritten: a new ADR supersedes it and both statuses are updated. A decision in a feature plan that outlives the feature is promoted to an ADR (`docs/playbooks/write-adr.md`).

## Consequences

- Every cross-cutting decision has one short, linkable record with its alternatives.
- The design history can be read from the ADRs alone.
- Small overhead per decision; discipline needed to promote decisions from plans.
