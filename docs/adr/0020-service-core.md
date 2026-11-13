# 0020. Service core: one library gives every service its config, logs, health, metrics, errors, OpenAPI and shutdown

- Status: proposed
- Date: 2026-11-14
- Deciders: project owner

## Context and problem statement

TASK-2 left api-gateway and catalog-service each with its own config loader, problem
filter, health controller and Swagger set-up, written twice and already drifting
apart. More services follow (identity, orders, notifications), and none of them had
structured logs, a correlation id, metrics, readiness or graceful shutdown. TASK-3
(`specs/003-service-core/`) asks for all of that once, the same in every service.

## Considered options

- Copy a service template into every new service
- One package per concern (logs, metrics, health…)
- One library, the [microservice chassis](https://microservices.io/patterns/microservice-chassis.html)
  pattern: `packages/service-core`

## Decision

**One workspace library, `@master-commerce/service-core`.** A service adopts it with
one module import and one start call (FR-061):

```ts
// app.module.ts
imports: [ServiceCoreModule.forRoot({ service, version, description, env: CatalogEnv,
  portVariable: 'CATALOG_PORT', envFile: ROOT_ENV_FILE, readiness: [DatabaseReadiness] })]
// main.ts
await startService(AppModule);
```

What it fixes for every service:

- **Config.** Each service declares an env class (class-validator decorators, defaults
  as initialisers, `@Secret()` for values never to print). It is checked once at
  start-up; every bad variable is named in one error and the service does not start.
  `@nestjs/config` is no longer used.
- **Logs.** pino through `nestjs-pino`: JSON lines on stdout with `service`, `version`,
  `requestId`; one line per request with the route template, status and duration;
  credentials redacted. `LOG_LEVEL`, and `LOG_PRETTY=true` for readable local output.
- **Correlation id.** Header `X-Request-Id`: a well-formed caller id is kept, otherwise
  a UUID is made; it is returned on the response, kept in `AsyncLocalStorage` for the
  request, and `correlationHeaders()` passes it on to other services.
- **Health.** `GET /health/live` (the process answers) and `GET /health/ready`
  (the service's readiness checks plus "not shutting down"; 503 otherwise), via
  `@nestjs/terminus`. Causes of a failed check go to the log, never to the response.
- **Metrics.** `GET /metrics` with prom-client: process and runtime metrics,
  `http_requests_total` and `http_request_duration_seconds` labelled by method, route
  template and status code. One registry per app.
- **Errors.** One global filter answers every error as RFC 9457 problem details;
  validation failures list the invalid fields (`errors[]` in the shared `ProblemDto`);
  unexpected errors answer 500 without internals and are logged with their stack.
- **OpenAPI.** Swagger UI at `/docs`, the document at `/docs-json`, the shared problem
  schema, a 500 answer on every operation. Every endpoint must state its auth
  requirement (`@Public()` until sign-in exists, TASK-7); an unmarked one stops the
  service at start-up.
- **Shutdown.** On SIGTERM / SIGINT readiness turns 503, new connections are refused,
  in-flight requests finish, hooks close the pools, exit 0; past
  `SHUTDOWN_TIMEOUT_MS` (default 8 s) the process exits 1.

Why one library: every service needs all of it, so one dependency with one version is
the least wiring; a fix reaches every service by updating it, which a copied template
cannot do. Separate packages per concern would only add imports. It is runtime code, so
it lives in `packages/`, not in `shared/` (ADR 0016).

Sentry or another error tracker is not part of it: it needs an outside service and is
planned with the observability stack (TASK-27).

## Consequences

- A new service gets every capability above from two calls; its own code is only its
  domain, its env class and its readiness checks.
- The services' HTTP surface changed: `GET /health` became `/health/live` and
  `/health/ready`; `/metrics` is new; logs are JSON. Nothing outside the services
  called `/health`.
- service-core is a dependency of every service: a breaking change in it touches all of
  them at once, so it is covered by its own tests and each service's integration tests.
- Revisit when tracing (W3C `traceparent`) or a non-HTTP transport (RabbitMQ consumers,
  TASK-8) needs the same correlation id.
