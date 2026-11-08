# write-adr — record an architecture decision

## Follow when
- A decision outlives the current task: a technology or library choice, a pattern
  (outbox, saga style), a convention (naming, error format), a deliberate trade-off.
- A feature `plan.md` contains such a decision → promote it.
- Not for choices local to one feature — those stay in its `plan.md` / `research.md`.

## Rules
1. Copy `docs/adr/template.md` to `docs/adr/<NNNN>-<kebab-title>.md`, `NNNN` = next free
   number, zero-padded to 4.
2. Title = the decision as a short noun phrase ("RabbitMQ with Transactional Outbox").
3. Context says what forces the decision and which task raised it (TASK-<N>).
4. At least two considered options, including the rejected ones, each with why not.
5. Consequences — good and bad, and when to revisit.
6. Status `proposed` while the PR is open; the owner's approval of the PR makes it
   `accepted`.
7. Never edit an accepted ADR's decision. Changing it → a new ADR that supersedes it;
   set the old one to `superseded by [NNNN](…)`.
8. Add the row to `docs/adr/README.md`; link the ADR from the feature plan / spec and
   from the related rows of `docs/technologies.md`.
9. Commit it in the task branch it belongs to (`docs(adr): …`).

## Limits
- No ADR for trivia (formatting, a variable name).
- An ADR never contradicts `docs/mvp-plan.md` or the constitution silently — update those in
  the same PR if needed.

## Done when
- The file follows the template, the index lists it, the plan / spec links it.
