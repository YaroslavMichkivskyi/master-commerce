# create-task — add a task or a bug to the backlog

## Follow when
- New work appears that is not in `backlog/` yet: a feature, a chore, a bug found
  while working or reported by the owner.
- Not for steps inside a task already in progress — those go to its spec / `tasks.md`.

## Rules
1. **Every task lives in Backlog.md** (`backlog/tasks/`). Never track work in a
   free-form list, an issue tracker or a TODO comment instead.
2. **Priority `medium` by default** (`--priority medium`); `high` / `low` only when the
   owner says so.
3. **Commit it directly on `dev`** as `Update #<N>: create task` (ADR 0015) — no branch,
   no PR; push after the owner's approval. The same for later backlog-only edits
   (re-prioritise, reword, archive): `Update #<N>: <what changed>`.
4. **Numbering is automatic and shared:** create through the CLI only
   (`backlog task create`), never by copying a file. The id is `TASK-<N>`; tasks and
   bugs share one counter, so `<N>` is unique across both.
5. **A bug is a task with type `bug`:**
   `backlog task create "<what is broken>" --type bug -l <area> --ac "<expected behaviour>"`.
   Its branch will be `bug-<N>`; every other type gets `task-<N>`.
6. **Self-contained:** the description says the goal, scope and where it touches
   (services / apps); acceptance criteria (`--ac`) are observable and testable; the
   Definition of Done comes from the config defaults.
7. **Labels:** one mode label for features — `speckit-full`, `speckit-light` or
   `no-spec` (`docs/roadmap.md`) — plus area labels (`backend`, `web`, `events`,
   `data`, `infra`, `cloud`, `quality`, `process`). Bugs are usually `no-spec`.
8. **Dependencies** via `--dep task-<M>`; never depend on a task that comes later in
   `docs/roadmap.md` order.
9. **Size:** one task = one PR = at most one spec-kit feature. Bigger → split into
   several tasks (or subtasks with `-p TASK-<M>`).
10. Roadmap tasks keep `docs/roadmap.md` in sync: a new roadmap item → add its row there
   in the same change.
11. Text in English; titles start with the area or a verb, no trailing period.

## Limits
- Do not create follow-up tasks without the owner's approval (Backlog.md finalization
  guide); suggest them in the PR / report instead.
- Do not renumber, delete or reuse ids. Cancelled work → `backlog task archive TASK-<N>`.

## Done when
- `backlog task view TASK-<N> --plain` shows the description, ACs, labels, dependencies.
- The new task file is committed on `dev` as `Update #<N>: …`, or together with the
  change that motivated it when it is created inside a task branch.
