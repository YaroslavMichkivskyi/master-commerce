# master-commerce — rules for coding agents

An online computer-hardware shop (NestJS microservices + Next.js) used for my
master's work and for trying out technologies and AI-assisted development. MVP first;
follow-up work continues in separate branches. This file is the entry point; it is
read by every agent runtime.

## Rules

- **Language: everything in this repo is English** — code, comments, docs, specs,
  ADRs, backlog tasks, commit messages, PR titles and bodies. The only exception is a
  quoted original (a name, a citation).
- **Every change belongs to a backlog task** (`backlog/`, Backlog.md) and is made on
  its own branch from `dev`: `task-<N>`, or `bug-<N>` for a task of type bug, where
  `<N>` is the task number — never invented. Changes reach `dev` only through a PR;
  `main` gets only stable parts, merged from `dev` (ADR 0012, ADR 0017).
- **Exceptions, committed directly on `dev` without a branch** (ADR 0017):
  backlog-only changes (`chore(backlog): …`) and changes to the repo's own rules —
  `AGENTS.md`, `CLAUDE.md`, `docs/playbooks/`, process ADRs, the PR template,
  `.claude/skills/`, the constitution (`docs(process): …`).
- **The owner reviews every commit before it is made.** Work in small steps; after
  each one stop with only that step's changes in the working tree, report the files,
  what and why, how it was verified, and the proposed commit message; commit only
  after the owner approves, then continue. Never commit several unreviewed steps.
- **Before any fix, analyse the regressions it can cause** (a bug, a review finding, a
  failing check alike): who else uses the code being changed (callers, other services,
  contracts and OpenAPI, config, tests, CI), what changes for each of them, which edge
  cases the fix touches. Cover the risky ones with tests — the behaviour that must stay
  as well as the new one — and run the checks of every affected package. The step
  report and the PR state what could regress and how it is covered.
- **A change keeps references true, both ways** (`docs/playbooks/start-task.md` rule 8):
  whatever points to a renamed, renumbered, moved or changed name is updated, and every
  ADR, FR, path, command, variable or port named in the lines being written is checked
  against its target. Search by exact name in tracked files, read only the hit lines.
- **Conventional Commits for every commit** (`feat(catalog): …`, `fix(order): …`,
  `docs: …`, `chore(backlog): …`), no task id in branch commits. PRs into `dev` are
  merged with a **merge commit** titled `Merge TASK-<N>: <PR title> (#<PR>)` (ADR 0017).
  Write task ids as `TASK-<N>`, never `#<N>` (on GitHub that is a PR / issue).
- **Every HTTP API is documented with OpenAPI and served with Swagger UI**
  (`/docs`, `@nestjs/swagger`, ADR 0014): each endpoint has a summary, DTO schemas,
  status codes incl. errors, auth. An endpoint without it is not done.
- **Push, PRs, merges, tags and any other write to GitHub need the owner's explicit
  approval of the exact payload.** One approval = one action.
- The MVP is an ordinary e-commerce system; write it as a real shop would be
  written, following the principles in `docs/mvp-plan.md` §2. No speculative features.
- Data access: Drizzle ORM; hot-path queries may be hand-written SQL (ADR 0005).
- Features are specified with spec-kit (`docs/playbooks/speckit-run.md`); decisions
  that outlive a task go to `docs/adr/` (`docs/playbooks/write-adr.md`).
- **A technology, framework, library or tool applied for the first time** (or used in
  a new place) → add / update its row in `docs/technologies.md` in the same PR.
- The repo describes the shop and the engineering only: no academic content (topic,
  research questions, experiment plans) in any tracked file, commit or PR.
- Everything runs via Docker Compose on Windows, macOS and Linux; versions pinned.
- No real-project data, credentials or personal data in the repo.

## Map

| Path | What |
|---|---|
| `docs/mvp-plan.md` | what the MVP contains; engineering principles |
| `docs/technologies.md` | every technology applied: link, where used, why |
| `docs/roadmap.md` | order of work, task modes, ADR list |
| `docs/adr/` | architecture decisions (MADR), index in its `README.md` |
| `shared/` | contracts shared by apps: DTOs / interfaces, events, protobuf (ADR 0016) — types only, no logic |
| `docs/playbooks/` | procedures for agents and people (below) |
| `backlog/` | Backlog.md: numbered tasks (`backlog task list --plain`) |
| `specs/<NNN>-<name>/` | spec-kit features; `NNN` = task number |
| `.specify/` | spec-kit 0.14.1 engine; `memory/constitution.md` — plan gates |
| `.claude/skills/` | Claude Code skills: `speckit-*` (vendored) and thin invokers of the playbooks |
| `.github/pull_request_template.md` | PR body for every task PR |

## Playbooks — follow when the trigger fires

| Playbook | Follow when |
|---|---|
| `docs/playbooks/create-task.md` | new work or a bug has no task yet |
| `docs/playbooks/start-task.md` | starting any task — branch `task-<N>` / `bug-<N>` from `dev` |
| `docs/playbooks/speckit-run.md` | a task labelled `speckit-full` / `speckit-light` |
| `docs/playbooks/close-task.md` | a task is implemented — verify, close, push, PR to `dev` |
| `docs/playbooks/write-adr.md` | a decision outlives the current task |
| `docs/playbooks/release.md` | moving `dev` to `main`, version tags, `mvp-v1` |

Skills in `.claude/skills/` are **thin invokers**: a rule that exists only in a skill
does not exist — it belongs in the playbook. Deleting every skill must leave each
procedure complete.

## Backlog.md quick reference

- `backlog task list --plain`, `backlog task view TASK-<N> --plain` — read.
- `backlog task create "<title>" [--type bug] -l <labels> --priority medium --ac "<criterion>"` — add
  (priority `medium` unless the owner says otherwise).
- `backlog task edit TASK-<N> -s "In Progress"` / `--check-ac 1` /
  `--final-summary "…" -s Done` — update.
- Workflow guides: `backlog instructions overview | task-creation | task-execution | task-finalization`.
- Change task files through the CLI, not by hand, so ids and metadata stay consistent.
