# Research: Service chassis

Decisions behind [plan.md](plan.md). Versions checked on npm on 2026-11-13; every one
was published more than two weeks earlier.

## R-1. One package, its shape

- **Decision:** one workspace library `packages/service-chassis`
  (`@master-commerce/service-chassis`), ESM, built with `tsc` like `shared/dto`
  (`^build` runs before the apps' `dev`). It exports:
  - `ChassisModule.forRoot({ service, version, env, readiness })` — the one module a
    service imports (FR-061);
  - `createChassisApp(AppModule, options)` — builds the Nest app with logger, pipes,
    filter, Swagger, metrics and shutdown wired; `main.ts` calls it and listens, the
    integration tests call it and do not;
  - the helpers a service uses in its own code: `@Public()`,
    `@ApiProblemResponses(...)`, `correlationHeaders()`, the env decorators.
- **Why one package:** every service needs all of it; one version, one import.
  Runtime code belongs in `packages/`, not `shared/` (ADR 0016).
- **Rejected:** one package per concern (logs, metrics, health…) — more wiring in
  every service for no gain now; a Nest "base app" class to extend — inheritance hides
  the wiring and fights Nest's module system.

## R-2. Configuration (FR-001)

- **Decision:** each service declares an env class with class-validator decorators
  (already a dependency, ADR 0016 DTOs use it): `@IsPort()`, `@IsInt() @Min() @Max()`,
  `@IsUrl({ protocols: ['http','https'], require_tld: false })`, defaults as field
  initialisers. The chassis loads the repo-root `.env` (path passed by the service, as
  in TASK-2), converts with class-transformer, runs `validateSync` once and throws one
  error listing every bad variable with the rule it broke. Fields marked `@Secret()`
  are reported by name only. The validated object is injectable (`ENV` token), typed.
- `@nestjs/config` is removed from the services: the chassis does the one thing it was
  used for (loading `.env`), and the TASK-2 `loadConfig` functions go away.
- **Rejected:** zod / joi — a second validation library next to class-validator.

## R-3. Logs (FR-010, FR-013)

- **Decision:** pino 10.4.0 through `nestjs-pino` 5.3.1 (+ `pino-http` 11.0.0, its
  peer), replacing Nest's default logger for the app and for `Logger` calls in code.
  JSON to stdout; `LOG_LEVEL` (default `info`), `LOG_PRETTY=true` switches on
  `pino-pretty` 13.2.0 (dev dependency of the chassis, loaded only when set). Base
  fields: `service`, `version`. Request log on completion: method, route, status,
  duration, request id. `redact` removes `req.headers.authorization`,
  `req.headers.cookie`, `res.headers["set-cookie"]`; connection strings are never
  logged (the DB error path logs the driver message only, which has no password).
- **Why pino:** the fastest structured logger for Node, native JSON, first-class Nest
  integration; the de-facto choice for Prometheus / Loki style stacks (TASK-13).

## R-4. Correlation id (FR-011, FR-012)

- **Decision:** header `X-Request-Id`. `pino-http`'s `genReqId` keeps the incoming
  value if it matches `^[A-Za-z0-9._:-]{1,128}$`, else generates `randomUUID()`; the
  same id is set on the response header. The chassis keeps it in an
  `AsyncLocalStorage` for the request, so `correlationHeaders()` returns
  `{ 'x-request-id': id }` anywhere in the call chain; the gateway's catalog client
  adds it to every upstream call.
- **Rejected:** W3C `traceparent` — belongs to tracing, which is out of scope; a
  request-scoped Nest provider — makes every provider in the chain request-scoped.

## R-5. Health (FR-020, FR-021)

- **Decision:** `@nestjs/terminus` (already used). `GET /health/live` → 200 with no
  checks. `GET /health/ready` → runs the readiness checks the service registers
  (catalog: `select 1` on its pool; gateway: none) plus the chassis' own
  "not shutting down" check; 503 when any fails. A failed check reports
  `{ status: 'down', message: '<check> unreachable' }` and logs the cause. The health
  endpoints answer in terminus' format, not problem+json (they are probes, not API
  errors), as in TASK-2.

## R-6. Metrics (FR-030)

- **Decision:** prom-client 15.1.3, one `Registry` per app (not the global default,
  so several apps in one test process do not collide). `collectDefaultMetrics` with
  the service label; `http_requests_total` (counter) and
  `http_request_duration_seconds` (histogram, buckets 5 ms…5 s), labels `method`,
  `route` (the Nest route template, `unmatched` for 404s, so ids never explode the
  label set), `status_code`. Recorded in a middleware on `res.finish`; `/health/*`,
  `/metrics`, `/docs*` skipped. `GET /metrics` answers `text/plain; version=0.0.4`.

## R-7. Errors (FR-040–FR-042)

- **Decision:** the TASK-2 problem filters (gateway and catalog) become one global
  chassis filter (`APP_FILTER`): `HttpException` → its status; anything else → 500,
  logged with the cause; `detail` only below 500. The `ValidationPipe`
  (`whitelist`, `forbidNonWhitelisted`, `transform`) gets an `exceptionFactory` that
  throws a 400 carrying `errors: [{ field, messages[] }]`. Unknown routes are Nest's
  `NotFoundException`, so they already pass through the filter as 404. The gateway's
  upstream errors become `HttpException`s (502 / 503) in its catalog client, so the
  same filter answers them and the gateway's own filter is deleted.
- `ProblemDto` in `shared/dto` gets the optional `errors` field; it stays the single
  schema (FR-050).

## R-8. OpenAPI (FR-050–FR-052)

- **Decision:** `createChassisApp` builds the document with the service name and
  version, registers `ProblemDto` as a component and serves `/docs` and `/docs-json`.
  `@ApiProblemResponses(400, 404, 502, …)` adds the error codes with the shared
  schema. `@Public()` marks an endpoint public (`security: []` and "Auth: public" in
  its description); a chassis test walks the document and fails if any operation has
  no explicit security, so a forgotten endpoint is caught. Health and metrics
  controllers come from the chassis already documented.

## R-9. Graceful shutdown (FR-060)

- **Decision:** `enableShutdownHooks()`. On SIGTERM / SIGINT the chassis sets the
  shutting-down flag first (readiness → 503), then Nest closes the HTTP server
  (waits for in-flight requests) and runs `onApplicationShutdown` hooks (the catalog
  pool's `end()` already exists). A watchdog timer of `SHUTDOWN_TIMEOUT_MS` (default
  8000, `unref`'d) exits with code 1 if closing takes longer. Keep-alive connections
  are closed with `server.closeIdleConnections()` so an idle client cannot hold the
  shutdown.

## R-10. Tests

- Chassis: integration tests with a tiny test app inside the package (supertest):
  config errors, request id kept / replaced / propagated, log lines captured through a
  pino destination stream, liveness / readiness incl. during shutdown, metrics text
  and labels, problem bodies for 400 / 404 / 500, OpenAPI security check, shutdown
  exit codes (child process).
- Services: TASK-2 tests updated to the new health paths; gateway test asserts the
  stub catalog receives the caller's `X-Request-Id`; catalog test asserts its log line
  carries it.
- NFR-001: a manual benchmark script (2 000 sequential `fetch` calls, no new
  dependency) on a trivial route of the test app, bare Nest vs the chassis; medians
  recorded in the task notes, not run in CI.
