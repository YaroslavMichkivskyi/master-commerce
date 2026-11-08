# Architecture Decision Records

Decisions that outlive a single feature. Format: MADR (`template.md`); how and when to write one — `docs/playbooks/write-adr.md`.

| No. | Decision | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions as ADRs | accepted |
| [0002](0002-monorepo-pnpm-turborepo.md) | Monorepo with pnpm workspaces and Turborepo | accepted |
| [0003](0003-nestjs-microservices-db-per-service.md) | NestJS microservices with a database per service | accepted |
| [0004](0004-postgresql-17.md) | PostgreSQL 17 as the main DBMS | accepted |
| [0005](0005-drizzle-orm-and-raw-sql.md) | Drizzle ORM, hand-written SQL for hot-path queries | accepted |
| [0006](0006-rabbitmq-outbox-inbox.md) | RabbitMQ with Transactional Outbox / Inbox | accepted |
| [0007](0007-choreography-saga.md) | Choreography for the stock-reservation saga | accepted |
| [0008](0008-nextjs-app-router-ssr-isr.md) | Next.js App Router with SSR / ISR for SEO | accepted |
| [0009](0009-postgres-fts-no-elasticsearch.md) | Search on PostgreSQL FTS, no Elasticsearch | accepted |
| [0010](0010-lambda-async-only-cdk.md) | AWS Lambda for asynchronous work only; IaC with AWS CDK | accepted |
| [0011](0011-deploy-vm-compose-amplify.md) | Deployment: VM with Docker Compose, web on Amplify | accepted |
| [0012](0012-git-workflow.md) | Git workflow: dev → main, task / bug branches, PRs, tags | accepted, amended by 0015 |
| [0013](0013-process-tooling.md) | Process tooling: spec-kit for specs, Backlog.md for tasks | accepted |
| [0014](0014-openapi-swagger-for-every-api.md) | OpenAPI with Swagger UI for every HTTP API | accepted |
| [0015](0015-backlog-update-commits-on-dev.md) | Backlog-only changes are committed directly on dev as `Update #N` | accepted |
