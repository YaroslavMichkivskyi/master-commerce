# start-task — begin work on a backlog task

## Follow when
- The owner says "take TASK-N" / "start the next task", or work on any backlog task
  begins. Every change to the repo starts here (ADR 0012).

## Rules
1. **Pick the task.** Given a number → use it. Otherwise take the first `To Do` task in
   `docs/roadmap.md` order whose dependencies are all `Done`
   (`backlog task list --plain`, `backlog task view TASK-<N> --plain`). Never invent a
   number; if the work has no task yet → `create-task.md` first.
2. **Check readiness:** every dependency is `Done`; the working tree is clean
   (`git status`); no other task is `In Progress` unless the owner runs them in parallel.
3. **Branch from a fresh `dev`:**
   ```
   git checkout dev
   git pull --ff-only          # continue on local dev if there is no network
   git checkout -b task-<N>    # type bug → bug-<N>
   ```
   Lowercase, the bare number — no feature name in the branch (it is in the spec
   folder). Never branch from `main` or from another task branch.
4. **Mark it started** in the task branch:
   `backlog task edit TASK-<N> -s "In Progress" -a @<owner-or-agent> --plan "<short plan>"`.
5. **Choose the path by the mode label:**
   - `speckit-full` / `speckit-light` → `speckit-run.md`, spec folder
     `specs/<NNN>-<short-name>/` with `NNN` = task number zero-padded to 3;
   - `no-spec` / `bug` → implement directly; write the plan into the task
     (`--plan`), notes with `--append-notes`.
6. **Commit step by step, each step reviewed by the owner** (ADR 0017). One step is one
   reviewable change (a spec, a plan, one layer of code, CI, docs) that leaves the
   build green. After each step: stop with only that step's changes in the working
   tree (stash unrelated work), report the changed files, what and why, how it was
   verified (commands and results) and the proposed message; for a fix also the
   regression analysis (rule 7); commit only after the owner approves, then start the
   next step. Messages: Conventional Commits
   (`feat(catalog): …`, `fix(order): …`, `test: …`, `docs: …`, `chore: …`), no task id.
   The first commit may carry only the status change.
7. **A fix starts with a regression analysis** (`AGENTS.md`): before changing code,
   list who uses it and what changes for them — callers, other services, contracts
   and OpenAPI, config, tests, CI — and the edge cases the fix touches. Add tests for
   the risky ones: the behaviour that must stay and the new one; a new test must fail
   without the fix. Run the checks of every affected package, not only the one changed.
8. A decision that outlives the task → ADR (`write-adr.md`) in the same branch.

## Limits
- No work directly on `dev` or `main` — except backlog-only (`chore(backlog): …`) and
  repo-rule (`docs(process): …`) commits on `dev` (ADR 0017).
- No push and no PR here — that is `close-task.md`, behind the owner's approval.
- Scope = the task's description and ACs; anything else → suggest a new task.

## Done when
- Branch `task-<N>` / `bug-<N>` exists, cut from the current `dev`.
- The task is `In Progress` with an assignee and a plan.
- The spec folder exists (spec-kit modes) or the plan is in the task (others).
