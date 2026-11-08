# Technologies

Every technology, framework, library, tool and practice applied in this repo: what it
is, why it was chosen, and where exactly it is used. Updated in the same PR that first
applies something or uses it in a new place (`AGENTS.md`, `docs/playbooks/close-task.md`).

**Status:** `in use` — already applied in the repo; `planned` — decided (ADR / roadmap
task), not applied yet. A planned row turns `in use` when its task lands, with the
"Where used" column pointing at real paths.

## Process and AI-assisted development

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) | in use | coding agent that writes most of the code, specs and docs under human review | [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md), [`.claude/skills/`](../.claude/skills/) |
| [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) | in use | thin invokers of the playbooks and the vendored spec-kit commands | [`.claude/skills/`](../.claude/skills/) — `start-task`, `close-task`, `create-task`, `run-speckit`, `write-adr`, `release`, `speckit-*` |
| [AGENTS.md](https://agents.md/) | in use | one runtime-agnostic instruction file for any coding agent | [`AGENTS.md`](../AGENTS.md) |
| [Spec Kit](https://github.com/github/spec-kit) 0.14.1 | in use | spec-driven development: specify → clarify → plan → tasks → implement, with review gates | [`.specify/`](../.specify/), spec template override [`.specify/templates/overrides/spec-template.md`](../.specify/templates/overrides/spec-template.md), [`docs/playbooks/speckit-run.md`](playbooks/speckit-run.md), future `specs/<NNN>-<name>/`; ADR [0013](adr/0013-process-tooling.md) |
| Spec Kit constitution | in use | project principles the plan phase is gated by | [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) |
| [Backlog.md](https://github.com/MrLesk/Backlog.md) 1.55 | in use | numbered, file-based backlog in git that agents read and update via CLI | [`backlog/`](../backlog/), [`backlog/config.yml`](../backlog/config.yml), [`docs/playbooks/create-task.md`](playbooks/create-task.md); ADR [0013](adr/0013-process-tooling.md) |
| [Architecture Decision Records](https://adr.github.io/), [MADR](https://adr.github.io/madr/) format | in use | short, immutable records of decisions that outlive a task | [`docs/adr/`](adr/README.md), [`docs/playbooks/write-adr.md`](playbooks/write-adr.md); ADR [0001](adr/0001-record-architecture-decisions.md) |
| Playbooks (agent procedures) | in use | step-by-step rules for recurring work, readable by people and agents | [`docs/playbooks/`](playbooks/) |
| Vertical slices + [walking skeleton](https://wiki.c2.com/?WalkingSkeleton) | in use | slicing the MVP so the app works after every task | [`docs/roadmap.md`](roadmap.md) |

## Git and collaboration

| Technology | Status | Why | Where used |
|---|---|---|---|
| Git, [GitHub](https://github.com) | in use | version control, PRs, hosting | whole repo; branch model in ADR [0012](adr/0012-git-workflow.md) |
| `dev` → `main` + `task-<N>` / `bug-<N>` branches | in use | every change traceable to a task and a PR; stable `main` | [`docs/playbooks/start-task.md`](playbooks/start-task.md), [`close-task.md`](playbooks/close-task.md), [`release.md`](playbooks/release.md) |
| [Conventional Commits](https://www.conventionalcommits.org/) | in use | readable history; input for automated releases | commit and PR titles — ADR [0012](adr/0012-git-workflow.md) |
| GitHub PR template | in use | the same PR body for every task: task link, verification, docs | [`.github/pull_request_template.md`](../.github/pull_request_template.md) |
| [`.gitattributes`](https://git-scm.com/docs/gitattributes) (LF) | in use | identical line endings on Windows, macOS, Linux | [`.gitattributes`](../.gitattributes) |
| [release-please](https://github.com/googleapis/release-please) | planned (TASK-19) | versions, changelog and tags from Conventional Commits | — |
| [Dependabot](https://docs.github.com/en/code-security/dependabot) | planned (TASK-2) | dependency updates | — |

## Backend

| Technology | Status | Why | Where used |
|---|---|---|---|
| [TypeScript](https://www.typescriptlang.org/), [Node.js](https://nodejs.org/) | planned (TASK-2) | one language for services, web, Lambdas, tools | — |
| [pnpm](https://pnpm.io/) workspaces + [Turborepo](https://turbo.build/repo) | planned (TASK-2) | monorepo with cached, affected-only tasks | ADR [0002](adr/0002-monorepo-pnpm-turborepo.md) |
| [NestJS](https://nestjs.com/) | planned (TASK-2) | microservices framework: modules, DI, transports | ADR [0003](adr/0003-nestjs-microservices-db-per-service.md) |
| [PostgreSQL](https://www.postgresql.org/) 17 | planned (TASK-2) | a database per service; JSONB, FTS, `SKIP LOCKED` | ADR [0004](adr/0004-postgresql-17.md) |
| [Drizzle ORM](https://orm.drizzle.team/) | planned (TASK-4) | thin type-safe data access and migrations | ADR [0005](adr/0005-drizzle-orm-and-raw-sql.md) |
| PostgreSQL full-text search | planned (TASK-6) | product search without a separate search engine | ADR [0009](adr/0009-postgres-fts-no-elasticsearch.md) |
| [RabbitMQ](https://www.rabbitmq.com/) 4 + Transactional Outbox / Inbox | planned (TASK-8) | reliable domain events between services | ADR [0006](adr/0006-rabbitmq-outbox-inbox.md) |
| Choreography saga | planned (TASK-11) | stock reservation without distributed transactions | ADR [0007](adr/0007-choreography-saga.md) |
| [pino](https://getpino.io/), [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) Problem Details, OpenAPI | planned (TASK-3) | structured logs, one error format, API docs from code | — |
| JWT, [argon2](https://github.com/ranisalt/node-argon2) | planned (TASK-7) | authentication and password hashing | — |

## Frontend

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Next.js](https://nextjs.org/) App Router, SSR / ISR | planned (TASK-2, TASK-6) | crawlable, fast product pages | ADR [0008](adr/0008-nextjs-app-router-ssr-isr.md) |
| [React](https://react.dev/) | planned (TASK-2) | UI | — |
| JSON-LD `Product`, sitemap, canonical URLs | planned (TASK-6, TASK-18) | SEO | — |

## Quality and observability

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Prometheus](https://prometheus.io/), [Grafana](https://grafana.com/), cAdvisor, postgres_exporter | planned (TASK-13) | metrics and dashboards | — |
| [Playwright](https://playwright.dev/) | planned (TASK-14) | end-to-end tests of customer and admin journeys | — |
| [k6](https://k6.io/) | planned (TASK-14) | load and smoke tests | — |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | planned (TASK-14) | SEO / performance checks on PRs | — |
| [Trivy](https://trivy.dev/) | planned (TASK-19) | image vulnerability scan | — |

## Infrastructure and cloud

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Docker](https://www.docker.com/) Compose | planned (TASK-2) | the whole stack locally, the same files on the VM | ADR [0011](adr/0011-deploy-vm-compose-amplify.md) |
| [GitHub Actions](https://docs.github.com/en/actions) | planned (TASK-2) | CI, images, deploys, scheduled smoke runs | `docs/mvp-plan.md` §7 |
| [AWS CDK](https://aws.amazon.com/cdk/) | planned (TASK-15) | infrastructure as code | ADR [0010](adr/0010-lambda-async-only-cdk.md) |
| [AWS Lambda](https://aws.amazon.com/lambda/), SQS, S3, SES, EventBridge | planned (TASK-15–18) | asynchronous side work: e-mails, thumbnails, revalidation, sitemap | ADR [0010](adr/0010-lambda-async-only-cdk.md) |
| GitHub OIDC → AWS | planned (TASK-15) | deploys without long-lived keys | — |
| [MinIO](https://min.io/), [Mailpit](https://mailpit.axllent.org/) | planned (TASK-16, TASK-17) | local stand-ins for S3 and SES | — |
| [AWS Amplify Hosting](https://aws.amazon.com/amplify/hosting/), [Caddy](https://caddyserver.com/), GHCR | planned (TASK-19) | web hosting, TLS on the VM, image registry | ADR [0011](adr/0011-deploy-vm-compose-amplify.md) |
