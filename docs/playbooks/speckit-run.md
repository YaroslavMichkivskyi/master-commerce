# speckit-run — take a task through spec-kit

## Follow when
- A backlog task labelled `speckit-full` or `speckit-light` is started
  (`start-task.md` step 5), or the owner asks to "run spec-kit" on a task.
- Not for `no-spec` tasks and bugs.

## How the engine is set up here
- spec-kit **0.14.1** is vendored once in the repo root: engine in `.specify/`, Claude
  skills `speckit-*` in `.claude/skills/`. Scripts are bash (`.specify/scripts/bash/`);
  on Windows run them with Git Bash.
- The spec template is overridden in `.specify/templates/overrides/spec-template.md`
  (project style: Scope, US-n with Given / then acceptance, grouped FR-0xx, Out of Scope,
  Explicitly Not Restated Here, review checklist). Do not edit
  `.specify/templates/spec-template.md`.
- The current feature is resolved from `.specify/feature.json`, **not** from the git
  branch — that is why branches stay `task-<N>`.
- Principles / gates: `.specify/memory/constitution.md`.

## Rules
1. Branch `task-<N>` exists and the task is `In Progress` (`start-task.md`).
2. **Specify** with the task number and a short name, so the spec folder is
   `specs/<NNN>-<short-name>/`:
   `bash .specify/scripts/bash/create-new-feature.sh --json --number <N> --short-name <short-name> "<task title>"`
   (the `speckit-specify` skill does the same when given the number and short name).
   Input = the backlog task: description, scope, ACs. Every task AC must appear as a US
   acceptance bullet or an FR.
3. **Mode:**
   - `speckit-full`: specify → **clarify** (`speckit-clarify`, answers recorded in the
     spec's Clarifications) → plan → tasks → (optional `speckit-analyze`) → implement;
   - `speckit-light`: a short spec (Goal + acceptance, FRs, Out of Scope) → plan →
     tasks → implement; no user stories, no clarify unless something is ambiguous.
4. **GATE — spec review.** Summarise the spec and stop for the owner's approval before
   planning. Reject → fix the spec or abort.
5. **Plan** (`speckit-plan`): map every FR / US (constitution gate), list lasting
   decisions → ADRs, pin versions of new dependencies.
6. **GATE — plan review.** Stop for approval before generating tasks.
7. **Tasks** (`speckit-tasks`): dependency-ordered, by user story, with file paths;
   independent items marked `[P]` may be given to parallel subagents in separate git
   worktrees.
8. **Implement** (`speckit-implement`) phase by phase, ticking `[X]` in `tasks.md`,
   committing per phase on the task branch after the owner reviews it (`start-task.md` step 6). Tests with every phase.
9. Finish with `close-task.md`.

## Upgrading spec-kit
Stable tags only, never `*.devN`. Reinstall the CLI at the new tag, run
`specify init <tmp> --integration claude --script sh --ignore-agent-tools` in a temp
folder, copy `<tmp>/.specify` and `<tmp>/.claude/skills/speckit-*` over the repo copies,
keep `.specify/memory/constitution.md` and `.specify/templates/overrides/`, and commit
the upgrade alone (`chore: spec-kit X.Y.Z`) through its own task.

## Limits
- Never skip the two gates; never commit generated artifacts that contradict the
  approved spec.
- spec-kit never pushes or opens PRs — that is `close-task.md`.

## Done when
- `specs/<NNN>-<name>/` holds spec, plan, tasks (and research / data-model / contracts
  where the plan needs them); every task item is `[X]`; the code is committed on the
  task branch.
