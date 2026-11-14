# Tasks: Service core

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md)
**Tests**: required (constitution IV); each phase ships with its tests.

## Phase 1 — Setup
- [x] T001 Create `packages/service-core` (`package.json` with exact versions, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`); `pnpm install`
- [x] T002 [P] `shared/dto/src/problem.dto.ts`: optional `errors: { field, messages[] }[]` (R-7)

## Phase 2 — service-core (FR-001…FR-061)
- [x] T003 `src/env.ts`: `loadEnv`, `@Secret()`, `ENV` token; base env class (`LOG_LEVEL`, `LOG_PRETTY`, `SHUTDOWN_TIMEOUT_MS`) — FR-001
- [x] T004 `src/request-context.ts`, `src/logging.ts`: pino logger, request id, redaction, `correlationHeaders()` — FR-010…FR-013
- [x] T005 `src/errors/`: problem builder, global filter, validation `exceptionFactory` — FR-040…FR-042
- [x] T006 `src/health/`: live / ready, readiness checks, shutdown flag — FR-020, FR-021
- [x] T007 `src/metrics/`: registry, middleware, `/metrics` — FR-030
- [x] T008 `src/openapi.ts`: document, problem component, `@Public()`, `@ApiProblemResponses()` — FR-050…FR-052
- [x] T009 `src/lifecycle.ts`, `src/service-core.module.ts`, `src/options.ts`, `src/bootstrap.ts` (`createServiceApp`, `startService`) — FR-060, FR-061
- [x] T010 service-core tests in `test/` with a test app: config, logs and ids, errors, health, metrics, OpenAPI walk, shutdown (real HTTP server, `exit` injected)

## Phase 3 — catalog-service on service-core (FR-070)
- [x] T011 `src/env.ts`; `app.module.ts`, `main.ts`, `bootstrap.ts` via service-core; readiness check on the pool; delete `config.ts`, `common/`, `health/`; drop `@nestjs/config`
- [x] T012 Update unit and integration tests (health paths, request id header, metrics, OpenAPI paths and auth)

## Phase 4 — api-gateway on service-core (FR-070, FR-012)
- [x] T013 `src/env.ts`; client throws `HttpException`s and sends `correlationHeaders()`; module / bootstrap via service-core; delete `config.ts`, `common/`, `health/`; drop `@nestjs/config`
- [x] T014 Update tests; stub catalog receives the caller's `X-Request-Id`

## Phase 5 — Docs and verification
- [x] T015 [P] ADR 0020 + index + roadmap table
- [x] T016 [P] `docs/technologies.md`, `README.md`, `.env.example`
- [x] T017 [P] `quickstart.md`, `contracts/http.md`
- [x] T018 Full checks (`format:check`, `turbo run lint typecheck test test:integration build --force`); quickstart on Windows; NFR-001 benchmark; notes in TASK-3
