# master-commerce

An online shop of computer hardware built as a playground for my master's work.
Along the way I try out new technologies, refresh ones I have used before and
explore approaches to speeding up development with AI (spec-driven development,
coding agents, decision records, agent-readable backlogs).

The plan: first an MVP — a complete, ordinary e-commerce system; then follow-up work
for my research continues in separate branches.

- **Technologies used** — what, where and why: **[`docs/technologies.md`](docs/technologies.md)**

## Getting started

Needs Node.js 24 LTS (22.12+ works), Docker (Desktop on Windows / macOS, Engine +
Compose v2 on Linux) and Git. Works the same on Windows, macOS and Linux.

```
corepack enable        # once per machine: the pnpm version comes from package.json
pnpm install
pnpm dev
```

`pnpm dev` creates `.env` from `.env.example` if it is missing, checks that the ports
are free, starts the infrastructure in Docker Compose (3 × PostgreSQL, RabbitMQ) and
waits until it is healthy, then runs the apps on the host with hot reload
(ADR [0018](docs/adr/0018-local-stack-infra-in-compose-apps-on-host.md)):

| App | URL |
|---|---|
| web (storefront) | http://localhost:3000 |
| api-gateway | http://localhost:3001, Swagger UI at `/docs` |
| catalog-service | http://localhost:3002, Swagger UI at `/docs` |

Ports and connection strings are in `.env`. If a port is taken, `pnpm dev` names it;
change it in `.env`.

| Command | What |
|---|---|
| `pnpm stop` | stop the containers, keep the data |
| `pnpm reset` | stop the containers and delete their data |
| `pnpm lint`, `pnpm typecheck` | ESLint (type-checked) and TypeScript |
| `pnpm test` | unit tests |
| `pnpm test:integration` | integration tests on a throwaway PostgreSQL (needs Docker; ADR [0019](docs/adr/0019-test-tooling-vitest-testcontainers.md)) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm --filter <app> <script>` | one app only, e.g. `pnpm --filter catalog-service test` |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same checks on
every PR and push to `dev` / `main`. It can also be run by hand on any branch with a
choice of checks: Actions → ci → Run workflow, or
`gh workflow run ci.yml --ref <branch> -f test=true`.

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
