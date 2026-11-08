# create-task — add a task or a bug to the backlog

## Follow when
- New work appears that is not in `backlog/` yet: a feature, a chore, a bug found
  while working or reported by the owner.
- Not for steps inside a task already in progress — those go to its spec / `tasks.md`.

## Rules
1. **Every task lives in Backlog.md** (`backlog/tasks/`). Never track work in a
   free-form list, an issue tracker or a TODO comment instead.
2. **Numbering is automatic and shared:** create through the CLI only
   (`backlog task create`), never by copying a file. The id is `TASK-<N>`; tasks and
   bugs share one counter, so `<N>` is unique across both.
3. **A bug is a task with type `bug`:**
   `backlog task create "<what is broken>" --type bug -l <area> --ac "<expected behaviour>"`.
   Its branch will be `bug-<N>`; every other type gets `task-<N>`.
4. **Self-contained:** the description says the goal, scope and where it touches
   (services / apps); acceptance criteria (`--ac`) are observable and testable; the
   Definition of Done comes from the config defaults.
5. **Labels:** one mode label for features — `speckit-full`, `speckit-light` or
   `no-spec` (`docs/roadmap.md`) — plus area labels (`backend`, `web`, `events`,
   `data`, `infra`, `cloud`, `quality`, `process`). Bugs are usually `no-spec`.
6. **Dependencies** via `--dep task-<M>`; never depend on a task that comes later in
   `docs/roadmap.md` order.
7. **Size:** one task = one PR = at most one spec-kit feature. Bigger → split into
   several tasks (or subtasks with `-p TASK-<M>`).
8. Roadmap tasks keep `docs/roadmap.md` in sync: a new roadmap item → add its row there
   in the same change.
9. Text in English; titles start with the area or a verb, no trailing period.

## Limits
- Do not create follow-up tasks without the owner's approval (Backlog.md finalization
  guide); suggest them in the PR / report instead.
- Do not renumber, delete or reuse ids. Cancelled work → `backlog task archive TASK-<N>`.

## Done when
- `backlog task view TASK-<N> --plain` shows the description, ACs, labels, dependencies.
- The new task file is committed together with the change that motivated it, or on
  its own `chore` commit through a PR.
