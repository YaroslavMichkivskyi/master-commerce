# Implementation Plan: Service chassis

**Branch**: `task-3` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-service-chassis/spec.md`

## Summary

A new workspace library `@master-commerce/service-chassis` (`packages/service-chassis`)
gives every NestJS service, through `ChassisModule.forRoot(...)` and
`createChassisApp(...)`: validated env config, pino JSON logs with an `X-Request-Id`
correlation id carried across service calls, `/health/live` and `/health/ready`,
Prometheus `/metrics`, one RFC 9457 error filter (400 with field errors, 404, 5xx
without internals), Swagger at `/docs` with a shared problem schema and an explicit
auth marker on every endpoint, and graceful shutdown with a time limit.
`api-gateway` and `catalog-service` move onto it; their own filters, config loaders,
health controllers and Swagger set-up are deleted. Decisions: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict) on Node.js 24 LTS — as TASK-2

**Primary Dependencies** (new, exact versions):
- pino 10.4.0, nestjs-pino 5.3.1, pino-http 11.0.0; pino-pretty 13.2.0 (loaded only
  with `LOG_PRETTY=true`) — R-3;
- prom-client 15.1.3 — R-6;
- existing: NestJS 12.4, `@nestjs/swagger` 12.1, `@nestjs/terminus` 12.1,
  class-validator 0.15.1, class-transformer 0.5.1. `@nestjs/config` is removed from
  the services — R-2.

**Storage**: none new; catalog keeps its PostgreSQL.

**Testing**: Vitest 5.1 + supertest; Testcontainers for the catalog — ADR 0019, R-10

**Target Platform**: as TASK-2 (Windows / macOS / Linux hosts, `ubuntu-24.04` CI)

**Project Type**: monorepo; one new runtime package, two services changed

**Performance Goals**: ≤ 5 ms added median latency on a trivial route (NFR-001)

**Constraints**: no external service needed for logs, metrics, health (NFR-002);
exact versions; no secrets in logs (FR-013)

**Scale/Scope**: 1 package, 2 services migrated, 4 chassis endpoints per service
(`/health/live`, `/health/ready`, `/metrics`, `/docs`)

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Ordinary shop, no speculative features | pass | only what the two existing services use and the next ones need; no Sentry / tracing hooks (spec Q3) |
| II. Spec is the source of truth | pass | every FR mapped below; AC #2 reworded with the owner (Q1) |
| III. Local first | pass | logs to stdout, metrics pulled, nothing external (NFR-002) |
| IV. Tests ship with the change | pass | chassis integration tests + updated service tests (R-10) |
| V. Observable by default | pass | this task is principle V: `/health`, `/metrics`, JSON logs with correlation id |
| VI. No scope creep, decisions recorded | pass | Out of Scope respected; lasting decisions → ADR 0020 |
| VII. Git workflow and approval | pass | branch `task-3`, Conventional Commits, push / PR behind approval |
| Gate: versions pinned, cross-platform | pass | exact versions; no OS-specific code (shutdown test runs a child process on every OS) |
| Gate: technologies.md | pass | new rows: pino / nestjs-pino / pino-pretty, prom-client; `@nestjs/config` row updated |
| Gate: Swagger for every endpoint | pass | FR-050–FR-052; the security walk test fails on an unmarked operation |
| Gate: English | pass | — |

## Requirement mapping

| Requirement | Design | Verified by |
|---|---|---|
| FR-001 | `env.ts`: `loadEnv(EnvClass, envFile)`, `@Secret()`; services' `env.ts` classes | chassis int: several bad vars → one error naming all, secret value absent; service unit: defaults |
| FR-010, FR-013 | `logging.ts`: `LoggerModule.forRootAsync` (nestjs-pino), redact list, pretty switch | chassis int: captured JSON line has service, route, status, duration; no `authorization` |
| FR-011 | `genReqId` + response header; `request-context.ts` (AsyncLocalStorage) | chassis int: id kept, malformed id replaced, header returned, id in every line |
| FR-012 | `correlationHeaders()`; gateway `catalog.client.ts` sends it | gateway int: stub receives the caller's id; catalog int: log line has it; quickstart: one id in both terminals (AC #3) |
| FR-020, FR-021 | `health/health.controller.ts`, `ReadinessCheck` providers, shutdown flag | chassis int: live 200 always; ready 503 when a check fails and while shutting down; catalog int: DB stopped → ready 503, live 200 |
| FR-030 | `metrics/` registry, middleware, controller | chassis int: counters / histogram with route template; chassis endpoints not counted |
| FR-040–FR-042 | `errors/problem.filter.ts`, `validation.ts` (`exceptionFactory`), `ProblemDto.errors` | chassis int: 400 with field list, 404 unknown route, 500 without internals + logged cause |
| FR-050–FR-052 | `openapi.ts` in `createChassisApp`, `@ApiProblemResponses`, `@Public()` | chassis int: `/docs-json` has the problem component; every operation has explicit `security`; health / metrics listed |
| FR-060 | `lifecycle.ts`: shutdown hooks, flag, idle-connection close, watchdog | chassis int (child process): in-flight request finishes, exit 0; slow handler past the limit → exit 1 |
| FR-061 | `ChassisModule.forRoot`, `createChassisApp` | both services' `app.module.ts` / `main.ts` have only these two chassis calls (AC #2) |
| FR-070 | services migrated, TASK-2 copies deleted | services' int tests; `git grep` finds no `ProblemFilter` / `loadConfig` / `SwaggerModule` in `apps/` |
| NFR-001 | — | manual benchmark, recorded in the task notes |
| NFR-002 | — | quickstart with only Compose infra running |

## Project Structure

### Documentation (this feature)

```text
specs/003-service-chassis/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md       # how to see logs with one request id, metrics, health, shutdown
├── contracts/http.md   # chassis endpoints, problem body, headers
└── tasks.md            # next: speckit-tasks
```

### Source Code (repository root)

```text
packages/service-chassis/        # @master-commerce/service-chassis, built with tsc
  src/
    index.ts
    chassis.module.ts            # ChassisModule.forRoot({ service, version, env, readiness })
    create-app.ts                # createChassisApp(AppModule, options)
    env.ts                       # loadEnv, @Secret, ENV token
    logging.ts  request-context.ts
    health/   metrics/   errors/   openapi.ts   lifecycle.ts
  test/                          # integration tests against a small test app
shared/dto/src/problem.dto.ts    # + optional `errors` field
apps/api-gateway/src/            # env.ts (new), app.module.ts, main.ts, bootstrap.ts → chassis;
                                 # delete config.ts, common/, health/
apps/catalog-service/src/        # env.ts (new), readiness check on the pool; delete config.ts,
                                 # common/, health/
docs/adr/0020-service-chassis.md
```

**Structure Decision**: one runtime library under `packages/` (ADR 0016, mvp-plan §8
as updated in this task). It is the first entry of `packages/`; `pnpm-workspace.yaml`
already lists `packages/*`.

## Docs touched in this task

- `docs/adr/0020-service-chassis.md` (+ index, roadmap table): pino, prom-client,
  `X-Request-Id`, health paths, one package.
- `docs/technologies.md`: new rows (pino, nestjs-pino, pino-pretty, prom-client), the
  `@nestjs/config` row (removed), terminus row (now in the chassis).
- `README.md`: endpoints table (`/health/live`, `/health/ready`, `/metrics`), `LOG_PRETTY`.
- `.env.example`: `LOG_LEVEL`, `LOG_PRETTY`, `SHUTDOWN_TIMEOUT_MS`.
- `docs/mvp-plan.md` §8 (already updated with the spec).

## Complexity Tracking

None.
