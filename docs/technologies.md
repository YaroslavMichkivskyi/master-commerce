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
| [Conventional Commits](https://www.conventionalcommits.org/) | in use | readable history; input for automated releases | every commit and PR title — ADR [0017](adr/0017-commit-merge-and-review-conventions.md) |
| Merge commits into `dev` (`Merge TASK-<N>: …`) | in use | keeps every reviewed step; one line per task in `git log --first-parent dev` | ADR [0017](adr/0017-commit-merge-and-review-conventions.md), [`close-task.md`](playbooks/close-task.md) |
| Per-commit review by the owner | in use | every commit is seen before it is made; small, focused diffs | ADR [0017](adr/0017-commit-merge-and-review-conventions.md), [`start-task.md`](playbooks/start-task.md) |
| GitHub PR template | in use | the same PR body for every task: task link, verification, docs | [`.github/pull_request_template.md`](../.github/pull_request_template.md) |
| [`.gitattributes`](https://git-scm.com/docs/gitattributes) (LF) | in use | identical line endings on Windows, macOS, Linux | [`.gitattributes`](../.gitattributes) |
| [release-please](https://github.com/googleapis/release-please) | planned (TASK-19) | versions, changelog and tags from Conventional Commits | — |
| [Dependabot](https://docs.github.com/en/code-security/dependabot) version updates | in use | weekly grouped PRs into `dev` for npm (pnpm lockfile) and GitHub Actions | [`.github/dependabot.yml`](../.github/dependabot.yml) |
| GitHub rulesets (branch protection) | in use | `main`: only PRs with green `ci`, merge commits, no force-push or deletion; `dev`: no force-push or deletion. Free since the repo is public | repo Settings → Rules; [`release.md`](playbooks/release.md) |
| AI review of the branch before every PR (Claude Code `/code-review`) | in use | a second look at the whole diff; advises, the owner decides | [`close-task.md`](playbooks/close-task.md), PR template |

## Workspace and tooling

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Node.js](https://nodejs.org/) 24 LTS | in use | runtime of every app and script; native ESM, built-in `fetch` | [`.nvmrc`](../.nvmrc), `engines` in [`package.json`](../package.json) |
| [TypeScript](https://www.typescriptlang.org/) 6.0, strict, ESM (`NodeNext`; `Bundler` in web) | in use | one language everywhere; 6.0 is the newest that typescript-eslint supports | [`tsconfig.base.json`](../tsconfig.base.json), `tsconfig.json` of each package |
| [pnpm](https://pnpm.io/) 10 workspaces, [Corepack](https://nodejs.org/api/corepack.html) | in use | strict `node_modules`, one store per machine, the same pnpm everywhere via `packageManager` | [`pnpm-workspace.yaml`](../pnpm-workspace.yaml), [`package.json`](../package.json); ADR [0002](adr/0002-monorepo-pnpm-turborepo.md) |
| [Turborepo](https://turborepo.com/) 2.11 | in use | runs `build` / `lint` / `typecheck` / `test` in dependency order with caching and `--affected` | [`turbo.json`](../turbo.json); ADR [0002](adr/0002-monorepo-pnpm-turborepo.md) |
| [ESLint](https://eslint.org/) 10 + [typescript-eslint](https://typescript-eslint.io/) (type-checked rules) | in use | catches bugs the compiler does not (floating promises, unsafe `any`); type-only DTO imports in web | [`eslint.config.mjs`](../eslint.config.mjs), [`apps/web/eslint.config.mjs`](../apps/web/eslint.config.mjs) |
| [Prettier](https://prettier.io/) 3 | in use | one formatting, checked in CI | [`.prettierrc.json`](../.prettierrc.json), `pnpm format:check` |

## Backend

| Technology | Status | Why | Where used |
|---|---|---|---|
| [NestJS](https://nestjs.com/) 12 | in use | microservices framework: modules, DI, transports | [`apps/catalog-service/`](../apps/catalog-service/), [`apps/api-gateway/`](../apps/api-gateway/); ADR [0003](adr/0003-nestjs-microservices-db-per-service.md) |
| [Microservice chassis](https://microservices.io/patterns/microservice-chassis.html) (pattern) | in use | one library gives every service config checks (env classes with class-validator), logs with a correlation id, health, metrics, errors, OpenAPI and shutdown, so none of it is written twice; a dependency that every service updates with, not a copied template | [`packages/service-core/`](../packages/service-core/), used by catalog-service and api-gateway; ADR [0020](adr/0020-service-core.md) |
| [`@nestjs/terminus`](https://docs.nestjs.com/recipes/terminus) | in use | `/health/live` and `/health/ready`; readiness runs each service's checks (catalog: a database ping) and answers 503 when one fails or the service is stopping | [`packages/service-core/src/health/`](../packages/service-core/src/health/), [`apps/catalog-service/src/db/database.readiness.ts`](../apps/catalog-service/src/db/database.readiness.ts); ADR [0020](adr/0020-service-core.md) |
| [PostgreSQL](https://www.postgresql.org/) 17 + [`pg`](https://node-postgres.com/) | in use | a database per service; JSONB, FTS, `SKIP LOCKED` | [`docker-compose.yml`](../docker-compose.yml), [`apps/catalog-service/src/db/`](../apps/catalog-service/src/db/), the data generator's bulk load [`tools/datagen/src/load.ts`](../tools/datagen/src/load.ts); ADR [0004](adr/0004-postgresql-17.md) |
| [Drizzle ORM](https://orm.drizzle.team/) 0.45 + drizzle-kit | in use | thin type-safe data access; SQL migrations generated, committed and applied by a separate `db:migrate` step with the owner role; the service runs as a role without DDL or `DELETE` | [`apps/catalog-service/src/db/`](../apps/catalog-service/src/db/), [`apps/catalog-service/drizzle/`](../apps/catalog-service/drizzle/); ADR [0005](adr/0005-drizzle-orm-and-raw-sql.md) |
| UUIDv7 ids made by PostgreSQL ([RFC 9562](https://www.rfc-editor.org/rfc/rfc9562)) | in use | ids that grow with time: inserts at the end of the index, paging by id is paging by creation time, no guessable sequence | `uuid_v7()` in [`apps/catalog-service/drizzle/0002_uuid_v7.sql`](../apps/catalog-service/drizzle/0002_uuid_v7.sql); ADR [0022](adr/0022-service-database-conventions.md) |
| Soft delete (`deleted_at` / `deleted_by`) with partial unique indexes | in use | nothing is lost by a delete, rows can be restored; slugs and SKUs unique among live rows only | [`apps/catalog-service/src/db/schema.ts`](../apps/catalog-service/src/db/schema.ts), `…/restore` endpoints; ADR [0022](adr/0022-service-database-conventions.md) |
| Optimistic concurrency: `version`, `ETag` / `If-Match` ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#name-if-match), [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585#section-3)) | in use | two people editing one row: the later edit based on an old version answers `412`, an edit without a version `428`; nothing is overwritten silently | [`apps/catalog-service/src/admin/common/versioning.ts`](../apps/catalog-service/src/admin/common/versioning.ts); ADR [0022](adr/0022-service-database-conventions.md) |
| Keyset (cursor) pagination | in use | a page costs the same at any depth, unlike `OFFSET` | [`apps/catalog-service/src/admin/common/paging.ts`](../apps/catalog-service/src/admin/common/paging.ts); ADR [0022](adr/0022-service-database-conventions.md) |
| PostgreSQL row locks, advisory locks, recursive CTEs | in use | rules that read other rows (a tree without cycles, products only in leaves, an old slug never reused) hold under concurrent writes; the category tree is read with `WITH RECURSIVE` | [`apps/catalog-service/src/admin/categories/tree.ts`](../apps/catalog-service/src/admin/categories/tree.ts), [`…/common/slugs.ts`](../apps/catalog-service/src/admin/common/slugs.ts); ADR [0022](adr/0022-service-database-conventions.md) |
| Least-privilege database roles | in use | the service logs in as `catalog_app`: no DDL, no `DELETE` / `TRUNCATE`, a statement timeout; migrations run apart with the owner | [`apps/catalog-service/drizzle/0001_app_role.sql`](../apps/catalog-service/drizzle/0001_app_role.sql), [`src/db/migrate.ts`](../apps/catalog-service/src/db/migrate.ts); ADR [0022](adr/0022-service-database-conventions.md) |
| API gateway forwarding of service APIs | in use | every exposed endpoint declared in the gateway (OpenAPI, input validation) and forwarded with the service's status, body, `ETag` and problems | [`apps/api-gateway/src/catalog/admin/`](../apps/api-gateway/src/catalog/admin/), `CatalogClient.forward()`; ADR [0021](adr/0021-gateway-forwards-service-apis.md) |
| PostgreSQL full-text search | planned (TASK-6) | product search without a separate search engine | ADR [0009](adr/0009-postgres-fts-no-elasticsearch.md) |
| [RabbitMQ](https://www.rabbitmq.com/) 4 + Transactional Outbox / Inbox | broker runs in Compose; events planned (TASK-8) | reliable domain events between services | ADR [0006](adr/0006-rabbitmq-outbox-inbox.md) |
| Choreography saga | planned (TASK-11) | stock reservation without distributed transactions | ADR [0007](adr/0007-choreography-saga.md) |
| [OpenAPI](https://www.openapis.org/) 3 + [Swagger UI](https://swagger.io/tools/swagger-ui/) via [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) | in use | every HTTP API documented from code, browsable at `/docs`, input for contract tests | `/docs` of every service, set up in [`packages/service-core/src/openapi.ts`](../packages/service-core/src/openapi.ts) (`@Public()`, `@ApiProblemResponses()`); ADR [0014](adr/0014-openapi-swagger-for-every-api.md) |
| [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) Problem Details | in use | one error format (`application/problem+json`) for every route, invalid fields listed in `errors[]`; upstream failures → 502 / 503 | [`packages/service-core/src/errors/`](../packages/service-core/src/errors/), `ProblemDto` in [`shared/dto`](../shared/dto/) |
| [pino](https://getpino.io/) 10 + [`pino-http`](https://github.com/pinojs/pino-http) + [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino) | in use | structured JSON logs with a correlation id (`X-Request-Id`), one line per request, credentials redacted; Nest's `Logger` writes through it | [`packages/service-core/src/logging.ts`](../packages/service-core/src/logging.ts); ADR [0020](adr/0020-service-core.md) |
| [`pino-pretty`](https://github.com/pinojs/pino-pretty) | in use | readable log lines in a local terminal (`LOG_PRETTY=true`) | [`packages/service-core/src/logging.ts`](../packages/service-core/src/logging.ts) |
| Shared contracts packages with [class-validator](https://github.com/typestack/class-validator) + [class-transformer](https://github.com/typestack/class-transformer) | in use (`shared/dto`); planned (`shared/events`, TASK-8) | one definition of DTOs and events for every app; validation and OpenAPI from the same classes | [`shared/dto/`](../shared/dto/), ADR [0016](adr/0016-shared-contracts-folder.md) |
| [Protocol Buffers](https://protobuf.dev/) + [gRPC](https://grpc.io/) | optional — not adopted | typed service-to-service calls; `.proto` files would live in `shared/proto` | ADR [0016](adr/0016-shared-contracts-folder.md) |
| JWT, [argon2](https://github.com/ranisalt/node-argon2) | planned (TASK-7) | authentication and password hashing | — |

## Frontend

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Next.js](https://nextjs.org/) 16 App Router, SSR / ISR | in use (SSR); ISR planned (TASK-6) | crawlable, fast product pages; Server Components fetch from the gateway | [`apps/web/`](../apps/web/); ADR [0008](adr/0008-nextjs-app-router-ssr-isr.md) |
| [React](https://react.dev/) 19 | in use | UI | [`apps/web/app/`](../apps/web/app/) |
| JSON-LD `Product`, sitemap, canonical URLs | planned (TASK-6, TASK-18) | SEO | — |

## Quality and observability

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Vitest](https://vitest.dev/) 5 | in use | one fast runner with native ESM and TypeScript for unit, integration and contract tests | `vitest.config.ts` of each app; ADR [0019](adr/0019-test-tooling-vitest-testcontainers.md) |
| [SWC](https://swc.rs/) via [`unplugin-swc`](https://github.com/unplugin/unplugin-swc) | in use | emits decorator metadata for Nest DI under Vitest | `vitest.config.ts` of the Nest apps; ADR [0019](adr/0019-test-tooling-vitest-testcontainers.md) |
| Deterministic data generator: seeded `sfc32` random streams, Zipf-skewed brands | in use | a realistic hardware catalog of any size for demos and load tests, byte-for-byte the same for the same seed (checked by a SHA-256 hash); products per brand follow Zipf as in real shops | [`tools/datagen/`](../tools/datagen/) (`pnpm datagen`); spec [`specs/005-datagen/`](../specs/005-datagen/spec.md) |
| [`pg-copy-streams`](https://github.com/brianc/node-pg-copy-streams) 7 | in use | `COPY … FROM STDIN` for `pg`: bulk loading of the generated catalog in one transaction, far faster than row inserts | [`tools/datagen/src/load.ts`](../tools/datagen/src/load.ts) |
| [Testcontainers](https://testcontainers.com/) (`@testcontainers/postgresql`) | in use | a fresh PostgreSQL per integration test file, the same on every OS and in CI | [`apps/catalog-service/test/`](../apps/catalog-service/test/); ADR [0019](adr/0019-test-tooling-vitest-testcontainers.md) |
| [supertest](https://github.com/ladjs/supertest) | in use | HTTP tests against the Nest app in-process | `test/` of catalog-service and api-gateway; ADR [0019](adr/0019-test-tooling-vitest-testcontainers.md) |
| [`prom-client`](https://github.com/siimon/prom-client) | in use | `/metrics` of every service in the Prometheus format: process metrics, request count and duration by route template | [`packages/service-core/src/metrics/`](../packages/service-core/src/metrics/); ADR [0020](adr/0020-service-core.md) |
| [Prometheus](https://prometheus.io/), [Grafana](https://grafana.com/), cAdvisor, postgres_exporter | planned (TASK-13) | metrics and dashboards | — |
| [Playwright](https://playwright.dev/) | planned (TASK-14) | end-to-end tests of customer and admin journeys | — |
| [k6](https://k6.io/) | planned (TASK-14) | load and smoke tests | — |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | planned (TASK-14) | SEO / performance checks on PRs | — |
| [Trivy](https://trivy.dev/) | planned (TASK-19) | image vulnerability scan | — |

## Infrastructure and cloud

| Technology | Status | Why | Where used |
|---|---|---|---|
| [Docker](https://www.docker.com/) Compose | in use (local infrastructure); apps in containers planned (TASK-19) | pinned infrastructure on every OS with health checks and memory limits; the same files on the VM | [`docker-compose.yml`](../docker-compose.yml), [`tools/scripts/preflight.mjs`](../tools/scripts/preflight.mjs); ADR [0018](adr/0018-local-stack-infra-in-compose-apps-on-host.md), ADR [0011](adr/0011-deploy-vm-compose-amplify.md) |
| [GitHub Actions](https://docs.github.com/en/actions) | in use (CI); images, deploys planned (TASK-19) | lint, type check and tests on PRs and pushes, manual runs with selectable checks | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml); `docs/mvp-plan.md` §7 |
| [AWS CDK](https://aws.amazon.com/cdk/) | planned (TASK-15) | infrastructure as code | ADR [0010](adr/0010-lambda-async-only-cdk.md) |
| [AWS Lambda](https://aws.amazon.com/lambda/), SQS, S3, SES, EventBridge | planned (TASK-15–18) | asynchronous side work: e-mails, thumbnails, revalidation, sitemap | ADR [0010](adr/0010-lambda-async-only-cdk.md) |
| GitHub OIDC → AWS | planned (TASK-15) | deploys without long-lived keys | — |
| [MinIO](https://min.io/), [Mailpit](https://mailpit.axllent.org/) | planned (TASK-16, TASK-17) | local stand-ins for S3 and SES | — |
| [AWS Amplify Hosting](https://aws.amazon.com/amplify/hosting/), [Caddy](https://caddyserver.com/), GHCR | planned (TASK-19) | web hosting, TLS on the VM, image registry | ADR [0011](adr/0011-deploy-vm-compose-amplify.md) |
