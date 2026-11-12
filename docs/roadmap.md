# MVP roadmap

Version 2 — 2026-11-08. What we build — `mvp-plan.md`; here — **the order of work and
how it is sliced into tasks**. Every item is a Backlog.md task (`backlog/tasks/`) with
its goal, scope, acceptance criteria and dependencies; each is self-contained and
small enough for one spec-kit feature (`specs/<NNN>-<name>/`, `NNN` = task number).
Done in order, the tasks give the MVP, frozen by the `mvp-v1` tag.

## Slicing principles

- **A walking skeleton first, then vertical slices.** TASK-2 pulls one thin thread
  through everything (Next → gateway → service → Postgres, Docker Compose, CI). After
  that every slice adds a whole feature: API + pages + tests, not "the whole backend,
  then the whole frontend". Integration problems show up at once, and the app works
  after every slice.
- **One task — one branch `task-<N>` (bugs: `bug-<N>`) from `dev`, one PR to `dev`**
  (`docs/playbooks/start-task.md`, `close-task.md`).
- **Tests are part of every slice** (unit + integration + API contract). TASK-14 only
  adds end-to-end checks on top.
- **spec-kit mode** (task label):
  - `speckit-full` — `specify → clarify → plan → tasks → implement`: features with
    user-facing behaviour;
  - `speckit-light` — a short spec (goal, FRs, acceptance) → `plan → tasks →
    implement`, no user stories: infrastructure, where the "user" is a developer;
  - `no-spec` — a checklist task done directly.
- A decision that outlives the task (technology choice, pattern, convention) moves from
  the feature's `plan.md` to an ADR (`docs/adr/`, `docs/playbooks/write-adr.md`).

## Map

```
1 ─► 2 ─► 3 ─┬─► 4 ─► 5 ─► 6 ──────────────┐
             ├─► 7 ────────────────┐        │
             └─► 8 ─────► 9 ─► 10 ─┴─► 11 ─► 12
                                            │
         13 (after 3, grows with slices) ───┤
                                            ▼
                         14 ─► 15 ─► 16 ─► 17 ─► 18 ─► 19 ─► 20 (mvp-v1)
```

## Tasks, in execution order

| Task | Name | Mode | Depends on |
|---|---|---|---|
| TASK-1 | process-foundation — spec-kit, constitution, ADRs, backlog, playbooks | no-spec | — |
| TASK-2 | walking-skeleton — monorepo, one end-to-end page, Compose, CI | speckit-light | 1 |
| TASK-3 | service-chassis — config, logs, health, metrics, errors, OpenAPI | speckit-light | 2 |
| TASK-4 | catalog-model — brands, categories, attributes, products, admin API | speckit-full | 3 |
| TASK-5 | datagen — deterministic skewed hardware data | speckit-light | 4 |
| TASK-6 | storefront-browse — filters, facets, FTS, SSR / ISR pages, SEO | speckit-full | 5 |
| TASK-7 | identity — sign-up, sign-in, JWT, roles, addresses | speckit-full | 3 |
| TASK-8 | messaging — `shared/events`, outbox / inbox, RabbitMQ topology | speckit-light | 3 |
| TASK-9 | cart — guest and user cart, merge on sign-in | speckit-full | 6, 7 |
| TASK-10 | checkout — orders, statuses, payment stub, `order.placed` | speckit-full | 8, 9 |
| TASK-11 | stock-saga — reservation choreography, compensation | speckit-full | 10 |
| TASK-12 | admin-panel — catalog, prices, stock, orders in the web app | speckit-full | 4, 7, 11 |
| TASK-13 | observability — Prometheus, Grafana, exporters | speckit-light | 3 |
| TASK-14 | quality-gates — e2e, contract tests, k6 smoke, Lighthouse | speckit-light | 11, 12 |
| TASK-15 | aws-infra — CDK, budgets, OIDC, `deploy-lambdas` | speckit-light | 2 |
| TASK-16 | media — product images, presigned upload, thumbnails | speckit-light | 12, 15 |
| TASK-17 | cloud-bridge — events to SQS, `notify` e-mails | speckit-full | 11, 15 |
| TASK-18 | seo-automation — on-demand ISR, sitemap Lambda | speckit-light | 6, 17 |
| TASK-19 | delivery — images, VM deploy, Amplify, releases | speckit-light | 14, 15 |
| TASK-20 | mvp-freeze — review, runbook, merge to `main`, tag `mvp-v1` | no-spec | all |

AWS (TASK-15) is deliberately late: the 6 months of the AWS free plan start when the
account is created. The local parts of TASK-16 / TASK-17 can be done earlier, with
MinIO and Mailpit.

## ADRs

| No. | Decision |
|---|---|
| 0001 | Record architecture decisions as ADRs (MADR format) |
| 0002 | Monorepo: pnpm workspaces + Turborepo |
| 0003 | NestJS microservices, database per service |
| 0004 | PostgreSQL 17 as the main DBMS |
| 0005 | Drizzle ORM, hand-written SQL for hot-path queries |
| 0006 | RabbitMQ + Transactional Outbox / Inbox for events |
| 0007 | Choreography (not orchestration) for the stock-reservation saga |
| 0008 | Next.js App Router, SSR / ISR for SEO |
| 0009 | Search on PostgreSQL FTS, no Elasticsearch |
| 0010 | AWS Lambda for asynchronous work only; IaC with AWS CDK |
| 0011 | Deployment: VM + Docker Compose, web on Amplify |
| 0012 | Git workflow: `dev` → `main`, `task-N` / `bug-N` branches, PRs, version tags |
| 0013 | Process tooling: spec-kit for specs, Backlog.md for tasks |
| 0014 | OpenAPI with Swagger UI for every HTTP API |
| 0015 | Backlog-only changes committed directly on `dev` as `Update #N` (superseded by 0017) |
| 0016 | Shared contracts in a top-level `shared/` folder |
| 0017 | Commit, merge and review conventions: per-commit review, Conventional Commits, merge commits |
| 0018 | Local stack: infrastructure in Docker Compose, apps on the host |
| 0019 | Test tooling: Vitest everywhere, Testcontainers for integration tests |
