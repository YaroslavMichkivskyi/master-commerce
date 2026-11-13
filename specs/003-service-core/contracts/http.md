# HTTP contracts: Service core

What every service on service-core answers, in addition to its own endpoints. The
OpenAPI document is generated from code and served at `/docs` (UI) and `/docs-json`
(ADR 0014); this file is the review copy. Ports: api-gateway `GATEWAY_PORT` (3001),
catalog-service `CATALOG_PORT` (3002).

## Headers

- `X-Request-Id` on every response. A request may send one: kept when it matches
  `^[A-Za-z0-9._:-]{1,128}$`, otherwise replaced by a new UUID (FR-011). A service calling
  another sends the same id on (FR-012).

## Errors (FR-040…FR-042)

Every error of every route, including unknown routes (`404`), is
`application/problem+json` → `ProblemDto` (RFC 9457):

```json
{ "type": "about:blank", "title": "Service Unavailable", "status": 503,
  "detail": "catalog-service is unavailable", "instance": "/api/v1/categories" }
```

- `title` is the HTTP status phrase; `instance` is the request path.
- `detail` is the message of an error thrown on purpose; an unexpected error answers
  `500` with no `detail` (the cause is in the log).
- A request that fails validation answers `400` and lists the fields:

  ```json
  { "type": "about:blank", "title": "Bad Request", "status": 400,
    "detail": "The request is invalid", "instance": "/things",
    "errors": [ { "field": "parts.0.slug", "messages": ["slug must be longer than or equal to 1 characters"] } ] }
  ```

  Properties the endpoint does not declare are rejected the same way.

## Endpoints

All are public (`security: []`) and listed in the OpenAPI document (FR-051, FR-052).
None of them is written to the request log or counted in the metrics.

### `GET /health/live` (FR-020)
- `200` `{ "status": "ok", "info": {}, "error": {}, "details": {} }` — whenever the
  process answers; dependencies are not checked.

### `GET /health/ready` (FR-021)
- `200` with every check up:
  `{ "status": "ok", "info": { "database": { "status": "up" }, "lifecycle": { "status": "up" } }, … }`
- `503` when a check fails or the service is stopping:
  `{ "status": "error", "error": { "database": { "status": "down", "message": "database unreachable" } }, … }`
- The format is terminus', not problem+json: a probe, not an API error. Checks per
  service: catalog-service `database` (`select 1`); api-gateway none (a catalog outage
  is answered per request with 502 / 503). Every service has `lifecycle`.

### `GET /metrics` (FR-030)
- `200 text/plain; version=0.0.4` — the Prometheus text format, every series labelled
  `service="<name>"`:
  - process and Node.js runtime metrics (`process_cpu_seconds_total`,
    `nodejs_eventloop_lag_seconds`, …);
  - `http_requests_total{method, route, status_code}` — counter;
  - `http_request_duration_seconds{method, route, status_code}` — histogram, buckets
    5 ms … 5 s.
- `route` is the route template (`/api/v1/categories`, `/items/:id`), `unmatched` for
  unknown routes.

### `GET /docs`, `GET /docs-json` (FR-050)
- Swagger UI and the OpenAPI 3 document: title = service name, version, a description
  of the error format and `X-Request-Id`; components `ProblemDto`, `FieldErrorDto`;
  a `500` problem answer on every operation.

## Changed since TASK-2

- `GET /health` of both services → `GET /health/live` and `GET /health/ready`.
- catalog-service: errors of every route (not only `/categories`) are problem details.
