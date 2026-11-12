# Tasks: Service chassis

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md)
**Tests**: required (constitution IV); each phase ships with its tests.

## Phase 1 — Setup
- [ ] T001 Create `packages/service-chassis` (`package.json` with exact versions, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`); `pnpm install`
- [ ] T002 [P] `shared/dto/src/problem.dto.ts`: optional `errors: { field, messages[] }[]` (R-7)

## Phase 2 — Chassis (FR-001…FR-061)
- [ ] T003 `src/env.ts`: `loadEnv`, `@Secret()`, `ENV` token; base env class (`LOG_LEVEL`, `LOG_PRETTY`, `SHUTDOWN_TIMEOUT_MS`) — FR-001
- [ ] T004 `src/request-context.ts`, `src/logging.ts`: pino logger, request id, redaction, `correlationHeaders()` — FR-010…FR-013
- [ ] T005 `src/errors/`: problem builder, global filter, validation `exceptionFactory` — FR-040…FR-042
- [ ] T006 `src/health/`: live / ready, readiness checks, shutdown flag — FR-020, FR-021
- [ ] T007 `src/metrics/`: registry, middleware, `/metrics` — FR-030
- [ ] T008 `src/openapi.ts`: document, problem component, `@Public()`, `@ApiProblemResponses()` — FR-050…FR-052
- [ ] T009 `src/lifecycle.ts`, `src/chassis.module.ts`, `src/create-app.ts` — FR-060, FR-061
- [ ] T010 Chassis tests in `test/` with a test app: config, logs and ids, errors, health, metrics, OpenAPI walk, shutdown (child process)

## Phase 3 — catalog-service on the chassis (FR-070)
- [ ] T011 `src/env.ts`; `app.module.ts`, `main.ts`, `bootstrap.ts` via the chassis; readiness check on the pool; delete `config.ts`, `common/`, `health/`; drop `@nestjs/config`
- [ ] T012 Update unit and integration tests (health paths, problem format, request id in logs)

## Phase 4 — api-gateway on the chassis (FR-070, FR-012)
- [ ] T013 `src/env.ts`; client throws `HttpException`s and sends `correlationHeaders()`; module / bootstrap via the chassis; delete `config.ts`, `common/`, `health/`; drop `@nestjs/config`
- [ ] T014 Update tests; stub catalog receives the caller's `X-Request-Id`

## Phase 5 — Docs and verification
- [ ] T015 [P] ADR 0020 + index + roadmap table
- [ ] T016 [P] `docs/technologies.md`, `README.md`, `.env.example`
- [ ] T017 [P] `quickstart.md`, `contracts/http.md`
- [ ] T018 Full checks (`format:check`, `turbo run lint typecheck test test:integration build --force`); quickstart on Windows; NFR-001 benchmark; notes in TASK-3
