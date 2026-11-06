# master-commerce

An online shop of computer hardware built as a playground for my master's work.
Along the way I try out new technologies, refresh ones I have used before and
explore approaches to speeding up development with AI (spec-driven development,
coding agents, decision records, agent-readable backlogs).

The plan: first an MVP — a complete, ordinary e-commerce system; then follow-up work
for my research continues in separate branches.

- **Technologies used** — what, where and why: **[`docs/technologies.md`](docs/technologies.md)**

## Docs

| File | What |
|---|---|
| [`docs/technologies.md`](docs/technologies.md) | every technology, framework, library and tool applied, with links |
| [`docs/mvp-plan.md`](docs/mvp-plan.md) | what the MVP contains: product, architecture, events, deployment, CI |
| [`docs/roadmap.md`](docs/roadmap.md) | order of work and how it is sliced into tasks |
| [`docs/adr/`](docs/adr/README.md) | architecture decision records |
| [`docs/playbooks/`](docs/playbooks/) | how a task is created, started, specified, closed and released |
| [`backlog/`](backlog/) | numbered tasks ([Backlog.md](https://github.com/MrLesk/Backlog.md): `backlog board`) |

## Workflow

One backlog task → branch `task-<N>` (bugs: `bug-<N>`) from `dev` → spec-kit spec in
`specs/<NNN>-<name>/` when the task needs one → PR to `dev`. Rules for agents —
[`AGENTS.md`](AGENTS.md).

## Branches

| Branch | What |
|---|---|
| `main` | stable parts only, merged from `dev` |
| `dev` | ongoing work on the MVP |
| others | `task-<N>` / `bug-<N>` per backlog task; after the MVP — branches for follow-up work |
