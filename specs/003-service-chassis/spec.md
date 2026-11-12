# Feature Specification: Service chassis

**Feature Branch**: `task-3`
**Spec folder**: `specs/003-service-chassis/`
**Task**: TASK-3 — `backlog/tasks/task-3 - Service-chassis-config-logs-health-metrics-errors-OpenAPI.md`
**Mode**: speckit-light
**Status**: Approved (2026-11-13)
**Created**: 2026-11-13
**Input**: "Service chassis: config, logs, health, metrics, errors, OpenAPI"

---

## Scope

A shared base for every backend service of the shop, so that all of them start,
report, fail and stop the same way. It covers configuration checks at start-up,
structured logs with a correlation id that follows a request across services, health
and metrics endpoints, one error format, the API documentation and graceful shutdown.
`api-gateway` and `catalog-service` from TASK-2 move onto it, and the per-service
copies they have today (error filter, config checks, health, Swagger set-up) are
removed. Touches: `api-gateway`, `catalog-service`, a new shared runtime package. The
web app is not a backend service and is not touched.

---

## Goal

A developer creating the next service (identity, orders) gets health, metrics, logs,
errors, config checks, API docs and graceful shutdown by adopting the chassis, and
writes none of it again. An operator sees every service behave alike: the same
endpoints, the same log lines, the same error bodies, and can follow one request
through the logs of all the services it touched.

**Acceptance**
- Given each backend service running, when its health, metrics and API-docs endpoints
  are called and an error is provoked, then the endpoint paths, the response formats
  and the error body are the same in every service. *(TASK-3 AC #1)*
- Given a new NestJS service, when it imports the chassis module and starts through
  the chassis bootstrap, then it has every capability of FR-001…FR-061 with no other
  set-up code. *(TASK-3 AC #2, Clarifications Q1)*
- Given a request to the gateway that reaches `catalog-service`, when the logs of both
  are read, then the log lines of that request in both services carry the same
  correlation id, and the response tells the caller that id. *(TASK-3 AC #3)*
- Given Swagger UI at `/docs` of each service, when it is opened, then every endpoint
  is listed with its request / response schemas, every status code it can answer
  (including the problem responses) and its auth requirement. *(TASK-3 AC #4)*

### Edge Cases
- A required setting is missing or invalid → the service does not start; the error
  names every bad setting at once, not only the first.
- The caller sends its own correlation id → it is kept if it is well-formed, replaced
  by a new one if not (too long, unexpected characters).
- The database goes away while the service runs → liveness stays healthy (restarting
  would not help), readiness reports not ready, and the service answers its API calls
  with a problem response, not a hang.
- A stop signal arrives during a request → the request finishes (up to a time limit),
  new requests are refused, readiness reports not ready, then the process exits
  cleanly.
- An unknown route or a malformed request → the same problem format as any other
  error, with the right status code.

---

## Functional Requirements

### Configuration
- **FR-001** Each service MUST declare the settings it reads, with their types,
  ranges and defaults. On start-up all settings MUST be checked together; any invalid
  or missing required setting MUST stop the service with a message naming each of
  them and the expected form, never the secret value itself.

### Logs and correlation
- **FR-010** Every service MUST write logs as structured JSON lines to standard output:
  time, level, service name, message, and for request logs the method, route, status
  code and duration. Locally, a human-readable form MAY be switched on by a setting.
- **FR-011** Every incoming request MUST get a correlation id: the caller's one when
  it is well-formed, a newly generated one otherwise. It MUST appear in every log line
  written while handling the request and in a response header.
- **FR-012** When a service calls another service, it MUST pass the correlation id
  on, so that the called service logs and returns the same id.
- **FR-013** Logs MUST NOT contain secrets: authorization headers, cookies, passwords
  and the credentials part of connection strings are removed or masked.

### Health
- **FR-020** Every service MUST expose a liveness endpoint that only says whether the
  process can serve requests, without checking dependencies.
- **FR-021** Every service MUST expose a readiness endpoint that checks the
  dependencies it cannot work without (its database; for the gateway, none, since
  upstream failures are answered per request). It MUST answer `503` when any of them
  is down, or while the service is shutting down. Failure details go to the log, not
  to the response (no host names, users or driver messages).

### Metrics
- **FR-030** Every service MUST expose metrics in the Prometheus text format: the
  standard process and runtime metrics, and the count and duration of HTTP requests
  by method, route template and status code. The health, metrics and docs endpoints
  themselves are not counted.

### Errors
- **FR-040** Every error answer of every service MUST be an RFC 9457 problem response
  (`application/problem+json`) with `type`, `title`, `status`, `instance`, and
  `detail` for client errors. Server errors (`5xx`) MUST NOT reveal internals and MUST
  be logged with the cause.
- **FR-041** Validation failures of a request MUST answer `400` with a problem body
  that lists each invalid field and why.
- **FR-042** Unknown routes MUST answer `404` in the same format.

### API documentation
- **FR-050** Every service MUST serve its OpenAPI document and Swagger UI at the same
  paths (`/docs`, `/docs-json`), generated from the code, with the service's name and
  version. The problem response MUST be one shared schema referenced by every
  endpoint's error codes.
- **FR-051** Every endpoint MUST state its auth requirement. Until sign-in exists
  (TASK-7) every endpoint is public, and the document says so.
- **FR-052** The health and metrics endpoints MUST be in the OpenAPI document too.

### Lifecycle
- **FR-060** On a stop signal a service MUST stop accepting new requests, let
  in-flight requests finish within a configurable time limit, close its connections
  (database pool, upstream clients) and exit with code 0. Past the limit it MUST exit
  with a non-zero code.
- **FR-061** Adopting the chassis MUST take one module import and the chassis
  bootstrap call; the chassis MUST NOT need per-service copies of any of the above.

### Migration of the TASK-2 services
- **FR-070** `api-gateway` and `catalog-service` MUST run on the chassis, and their
  own error filters, config loaders, health controllers and Swagger set-up MUST be
  removed. Their public behaviour stays as in TASK-2 except where this spec changes
  it (health paths, error format of every route, correlation header).

### Non-functional
- **NFR-001** The chassis MUST add no more than 5 ms to the median latency of a
  trivial request on a typical laptop (measured with and without it).
- **NFR-002** Logs, metrics and health work with no external service running (no log
  collector, no Prometheus); collecting them is TASK-13.

---

## Out of Scope
- Prometheus server, Grafana dashboards, exporters, log collection — TASK-13.
- Distributed tracing (OpenTelemetry spans) — not planned for the MVP; the correlation
  id covers following a request.
- Authentication and auth schemes in OpenAPI — TASK-7 (FR-051 only states "public").
- Rate limiting — TASK-25. Error tracking (Sentry) — TASK-27.
- Messaging (correlation id in events) — TASK-8 reuses FR-011 for messages.
- The web app's logs and metrics.
- Enforcing the DTO rules in the database — TASK-4 AC #4.

## Explicitly Not Restated Here
- Constitution principle V (observable and documented by default).
- ADR 0003 (NestJS, database per service), 0014 (OpenAPI + Swagger UI for every API),
  0016 (`shared/` holds contracts only, runtime code goes to `packages/`), 0019
  (Vitest + Testcontainers).
- `docs/mvp-plan.md` §2 principle 4 (observability from day one), §8 (layout).
- TASK-2 spec FR-004, FR-011, FR-012, which this spec generalises.

## Assumptions
- One runtime package holds the whole chassis (a library under `packages/`, ADR 0016),
  not one package per concern: every service needs all of it, and splitting can come
  later if a service needs only a part.
- The correlation id header is `X-Request-Id`, the de-facto standard name; the
  response returns the same header.
- Health paths: `/health/live` and `/health/ready`. The TASK-2 `/health` is replaced;
  nothing outside the repo calls it yet.
- The default shutdown time limit is 8 s: below Docker's default 10 s stop grace
  period, so the service exits on its own before it is killed once it runs in a
  container (TASK-19).

## Clarifications

### Session 2026-11-13
- Q1: TASK-3 AC #2 says "one module import". A module alone cannot set up Swagger UI
  or shutdown hooks, which need the application object. → A: one module import
  **plus** the chassis bootstrap call in `main` (FR-061); AC #2 reworded to match.
- Q2: The task names the package `packages/observability`, but the chassis also covers
  config, errors, OpenAPI and lifecycle. → A: `packages/service-chassis`;
  `docs/mvp-plan.md` §8 updated.
- Q3: Add error tracking (Sentry) to the chassis now? → A: no, it stays in TASK-27.
  It needs an outside service and a DSN, which breaks "local first" and NFR-002; the
  chassis gets no placeholder for it (no speculative extension points).

---

## Review & Acceptance Checklist
- [x] No implementation details in requirements — only the ADR-fixed stack and the RFC / Prometheus formats are named
- [x] Every requirement is testable and unambiguous; IDs are stable
- [x] Goal has Given / then acceptance; edge cases listed
- [x] Scope is bounded; Out of Scope names the owning task where relevant
- [x] Matches the backlog task's acceptance criteria (AC #1–#4 mapped above)
- [x] No speculative features or extension points (mvp-plan.md §2)
- [x] Every new / changed endpoint is listed — liveness, readiness, metrics, docs; all in OpenAPI (FR-050–FR-052)
- [x] No `[NEEDS CLARIFICATION]` markers remain
