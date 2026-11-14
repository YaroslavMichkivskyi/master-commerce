---
id: TASK-3
title: 'Service core: config, logs, health, metrics, errors, OpenAPI'
status: In Progress
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-08T14:38:00Z'
updated_date: '2026-11-14T23:37:00Z'
labels:
  - mvp
  - speckit-light
  - backend
dependencies:
  - TASK-2
priority: medium
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A shared base so every service behaves the same operationally.

Scope:
- `packages/service-core` (Microservice chassis pattern): a base NestJS module: env config validation, structured logs (pino) with correlation id propagated by the gateway, `/health` (liveness / readiness), `/metrics` (Prometheus), one error format (RFC 9457 Problem Details), OpenAPI from code, graceful shutdown
- the TASK-2 services moved onto service-core

Spec: `specs/003-service-core/`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every service exposes the same health, metrics, error format and OpenAPI
- [ ] #2 A new service adopts service-core with one module import and the service-core bootstrap call
- [ ] #3 A request's correlation id appears in the logs of gateway and service
- [ ] #4 Swagger UI at /docs shows every endpoint with schemas, status codes and auth (ADR 0014)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (spec, ADR, README / runbook) where behaviour changed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-light: spec specs/003-service-core -> plan -> tasks -> implement
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Verification, 2026-11-15

- `pnpm format:check` clean; `turbo run lint typecheck test test:integration build --force`: 21/21 tasks. Unit: web 8, gateway 19, catalog 10, service-core 79; integration: gateway 16, catalog 10.
- Fresh `git clone -b task-3` into an empty folder, no `.env`: `pnpm install --frozen-lockfile` 15 s, then the same checks, 21/21 (commit f7a6876).
- `git grep` finds no `ProblemFilter`, `loadConfig` or `SwaggerModule` in `apps/` (FR-070).

## Quickstart (`specs/003-service-core/quickstart.md`), Windows 11, Node 22.18

- S1: both services log JSON lines; `LOG_PRETTY=true` gives readable ones.
- S2: `CATALOG_PORT=abc`, `CATALOG_DATABASE_URL=mysql://x:secret@h/db` → one message naming both variables, the URL as `value hidden`, exit 1. First run printed the error a second time with its stack in Nest's text format; fixed in f7a6876.
- S3: `X-Request-Id: demo-42` returned by the gateway; the request lines of api-gateway and catalog-service both carry `"requestId":"demo-42"` (AC #3). Without the header a UUID is made and returned.
- S4: `/nowhere` → 404 `application/problem+json`; `CATALOG_SERVICE_URL` pointing at a free port → 503 "catalog-service is unavailable", one warn line `fetch failed`.
- S5: `docker compose stop postgres-catalog` → ready 503 "database unreachable", live 200; after start ready 200. The warn line has the driver message, no password.
- S6: `http_requests_total` by route template, `unmatched` for 404; no `/health` or `/metrics` series.
- S7: `/docs` 200; both documents list the service routes and `/health/live`, `/health/ready`, `/metrics`, all "Auth: public" with `security: []`, `ProblemDto` present (AC #4).
- S8: Ctrl+C in `pnpm dev` stops both services cleanly (checked by the owner; a signal cannot be sent to a native Windows process from a script).

## NFR-001 benchmark, 2026-11-15

A trivial `GET /ping`, bare Nest vs Nest on service-core (request logs on, stdout to a file), 2 000 sequential `fetch` calls after 300 warm-up, three alternating rounds, Node 22.18 on Windows. Median of the round medians: bare 0.338 ms, service-core 0.497 ms, **+0.16 ms** (limit 5 ms). p95: 0.44–0.70 ms vs 0.63–1.02 ms.

## Deviations from the plan

- `create-app.ts` became `bootstrap.ts` (`createServiceApp`, `startService`); signals are handled by `startService`, not `enableShutdownHooks()`.
- Shutdown is tested in-process with a real HTTP server and an injected `exit`, not in a child process.
- The request id in log lines is asserted in service-core's tests and seen in quickstart S3, not in catalog's integration test: a service's own module logs to stdout, which a test cannot capture.
- Known limit: if `NestFactory.create` itself fails, providers it already built are not closed (Nest does not hand out the half-built app). `startService` exits the process anyway.

## AI review (close-task step 4), 2026-11-15

Three `/code-review` runs; every finding verified before a fix (code read, a probe test, or a run), each fix with a test that fails without it.
- Run 1 (branch diff against `origin/dev`), 10 findings. Fixed: start-up bugs lost their stack (only config errors print just the message), the env was loaded twice, `CATALOG_SERVICE_URL` rejected host names with underscores, the filter wrote to a response already under way, a failed start left the app open, a 500 sent its message. Left: readiness drain delay (no load balancer on VM + Compose, ADR 0011), 5xx request lines at error level (alerting belongs to metrics, TASK-13). False positives: request id lost on requests with a body (a probe with a 90 kB body keeps it in the handler, the log and the header), caret peer ranges (installed versions are pinned by the apps and the lock file).
- Run 2 (the fixes), 9 findings. Fixed: a cut response is aborted, not ended as if complete, and always logged; Nest's log buffer detached when the start fails; a bad config recognised by name, not `instanceof`; test fixture env restored. False positive: `app.close()` replacing the start-up error (Nest 12 logs hook errors instead of throwing). Left: a close timeout on a failed start, hiding the detail of every 5xx (the owner chose 500 only).
- Run 3, 9 findings. Fixed: a 500 thrown on purpose is logged as an error with its stack; the test checks the error text and restores Nest's logger; a misleading comment. Left as rare with no impact today: metrics and logs of failing streams (no streaming endpoint yet), a handler that ends the response and then throws, class renaming by a bundler (services are built with `tsc`), the `Error:` header of the config error's stack.
<!-- SECTION:NOTES:END -->
