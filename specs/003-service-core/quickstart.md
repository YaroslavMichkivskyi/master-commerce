# Quickstart: validate service core

## Prerequisites
- The walking skeleton runs (`specs/002-walking-skeleton/quickstart.md`): Node.js 24,
  `corepack enable`, Docker.
- An existing `.env` needs nothing new: `LOG_LEVEL`, `LOG_PRETTY` and
  `SHUTDOWN_TIMEOUT_MS` have defaults (see `.env.example`).

## Scenarios

1. **Start (FR-001, FR-061).** `pnpm dev`. Both services log a JSON line
   `"<service> listening on http://…"`. Set `LOG_PRETTY=true` in `.env` and restart:
   the same lines become readable.

2. **A bad setting stops the service (FR-001).** In `.env` set `CATALOG_PORT=abc` and
   `CATALOG_DATABASE_URL=mysql://x:secret@h/db`, restart. catalog-service exits with one
   message naming both variables; the URL shows as `value hidden`, `secret` is nowhere.
   Restore `.env`.

3. **One request id across services (FR-011, FR-012, AC #3).**
   ```
   curl -i -H "X-Request-Id: demo-42" http://localhost:3001/api/v1/categories
   ```
   The response has `X-Request-Id: demo-42`. The terminal shows a request line with
   `"requestId":"demo-42"` from api-gateway and one from catalog-service. Without the
   header a UUID is made and returned.

4. **Errors (FR-040…FR-042).** `curl -i http://localhost:3001/nowhere` → `404` with
   `content-type: application/problem+json`. Set
   `CATALOG_SERVICE_URL=http://localhost:3999` (nothing listens there) in `.env`,
   restart, then `curl -i http://localhost:3001/api/v1/categories` → `503` problem
   "catalog-service is unavailable"; the gateway logs one warn line with the cause.
   Restore `.env`.

5. **Health (FR-020, FR-021).**
   ```
   curl -i http://localhost:3002/health/live
   curl -i http://localhost:3002/health/ready
   docker compose stop postgres-catalog
   curl -i http://localhost:3002/health/ready   # 503, "database unreachable"
   curl -i http://localhost:3002/health/live    # still 200
   docker compose start postgres-catalog
   ```

6. **Metrics (FR-030).** After a few requests,
   `curl -s http://localhost:3001/metrics | grep http_requests_total` shows
   `route="/api/v1/categories"` with its count; no `/health` or `/metrics` series.

7. **OpenAPI (FR-050…FR-052, AC #4).** http://localhost:3001/docs and
   http://localhost:3002/docs list the service endpoints and `/health/*`, `/metrics`;
   each one says "Auth: public", lists its problem answers and has the `ProblemDto`
   schema.

8. **Graceful shutdown (FR-060).** Press Ctrl+C in `pnpm dev`: each service logs
   `SIGINT received, stopping` and `Stopped`, and the process ends with code 0.
