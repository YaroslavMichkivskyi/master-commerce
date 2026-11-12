# HTTP contracts: Walking skeleton

The OpenAPI document of each service is generated from code (`@nestjs/swagger`) and
served at `/docs` (UI) and `/docs-json` (document), ADR 0014. This file is the
review copy of what the code must produce. Contract tests check the code against it.

## api-gateway (public, port `GATEWAY_PORT`, default 3001)

### `GET /api/v1/categories`
- Summary: list product categories in display order.
- Auth: none (public storefront data).
- `200 application/json` → `CategoryListDto`
  ```json
  { "items": [ { "id": "4f6c…", "name": "CPUs", "slug": "cpus", "sortOrder": 10 } ] }
  ```
- `502 application/problem+json` → `ProblemDto` — the catalog answered with an error.
- `503 application/problem+json` → `ProblemDto` — the catalog was unreachable or timed
  out (2 s).
  ```json
  { "type": "about:blank", "title": "Service Unavailable", "status": 503,
    "detail": "catalog-service is unavailable" }
  ```

### `GET /health`
- `200` `{ "status": "ok" }` — the gateway process is up. It does not check
  upstreams, so a catalog outage does not mark the gateway unhealthy.

## catalog-service (internal, port `CATALOG_PORT`, default 3002)

### `GET /categories`
- Summary: all categories, ordered by `sortOrder`, then `name`.
- `200 application/json` → `CategoryListDto` (an empty table gives `{ "items": [] }`).
- `500 application/problem+json` → `ProblemDto`.

### `GET /health`
- `200` `{ "status": "ok", "info": { "database": { "status": "up" } } }`
- `503` when the database is unreachable (terminus format).

## web

### `GET /` (HTML)
- The server-rendered list of category names, one `<li>` each.
- Empty list → the text "No categories yet".
- Gateway error or problem response → the text "The catalog is unavailable right
  now", HTTP 200. The page never crashes.
