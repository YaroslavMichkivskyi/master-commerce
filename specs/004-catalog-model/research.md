# Research: Catalog model

Decisions behind [plan.md](plan.md). No new dependencies: everything below uses
PostgreSQL 17, Drizzle 0.45 and the packages the catalog already has.

## R-1. Identifiers: UUIDv7 made by the database (FR-035)

- **Decision:** every new table gets `id uuid DEFAULT uuid_v7()`, a SQL function created
  by a migration (48-bit millisecond timestamp, then random bits, RFC 9562). The
  database makes the id, so rows inserted without the service (the data generator's
  `COPY`, TASK-5; manual fixes) get the same kind of id.
- **Why:** ids that grow with time land at the right end of the B-tree, so inserts do
  not split pages all over the index, and keyset paging by id (R-6) is also paging by
  creation time.
- **Rejected:** `uuid_generate_v4()` / `gen_random_uuid()` — random placement; a
  `uuid` npm package — the database would not make ids itself; bigint sequences — ids
  in URLs would leak the catalog size and be guessable.
- Existing category ids (v4, from TASK-2) stay; only their order in the index is
  random, which does not matter for a table of hundreds of rows. PostgreSQL 18 has
  `uuidv7()` built in; the function is replaced by it when the image is upgraded.

## R-2. Money in cents (FR-021)

- **Decision:** `price_cents integer NOT NULL CHECK (price_cents > 0)`; the API
  carries `priceCents` (an integer). The euro sign and the formatting are the web's.
- **Why:** exact arithmetic everywhere (JSON numbers, JS, SQL), the usual way of
  payment APIs; `integer` holds up to 21 474 836.47 EUR.
- **Rejected:** `numeric(12,2)` with a decimal string in JSON — exact, but every client
  needs decimal parsing; a float — not exact.

## R-3. Soft delete, uniqueness, audit columns (FR-030, FR-031)

- **Decision:** every table has `created_at`, `created_by`, `updated_at`, `updated_by`,
  `deleted_at`, `deleted_by`, `version`. A row is deleted when `deleted_at IS NOT NULL`;
  there is no separate boolean, and `CHECK (deleted_at IS NOT NULL OR deleted_by IS
  NULL)` keeps the pair consistent. Uniqueness that must hold only among live rows is
  a partial unique index (`UNIQUE (slug) WHERE deleted_at IS NULL`). The `*_by` columns
  are `uuid NULL` until TASK-7 fills them; restore clears `deleted_at` and
  `deleted_by` and sets `updated_*`.
- **Why:** one column can't disagree with itself; the partial index is how PostgreSQL
  expresses "unique among live rows".
- **Reads:** one helper adds `deleted_at IS NULL` to every query of the admin and
  public reads; each list has a test that a deleted row is absent.

## R-4. Versions and conditional requests (FR-033)

- **Decision:** `version integer NOT NULL DEFAULT 1`, incremented by every update in
  the same statement:
  `UPDATE … SET …, version = version + 1 WHERE id = $1 AND version = $2 RETURNING *`.
  No row → read it: missing → `404`, else `412`. Reads return the version in the body
  and as `ETag: "<version>"`; every write (`PATCH`, `PUT`, `DELETE`, publish,
  unpublish, restore) needs `If-Match: "<version>"`, without it `428`.
- **Why:** the standard HTTP way (RFC 9110 §13.1.1, RFC 6585 §3), one round trip, no
  locks held between the read and the write.
- Attributes are part of their category: changing them needs the category's version
  and bumps it.

## R-5. Category tree (FR-010, FR-013, FR-015)

- **Decision:** adjacency list (`parent_id` → `category.id`). Ancestors and subtrees
  are read with recursive CTEs; the tree has hundreds of rows, so this is cheap. A
  move, a new child and a product write lock the rows they depend on
  (`SELECT … FOR UPDATE` on the category and its ancestors) inside one transaction, so
  two concurrent writes cannot together break a rule that each checked alone.
- **Rejected:** `ltree` / materialised paths — faster subtree reads the MVP does not
  need, and every move rewrites all descendants; a closure table — another table to
  keep in step.

## R-6. Cursor paging (FR-034)

- **Decision:** lists are ordered by `id` (UUIDv7: creation order); a page is
  `WHERE <filters> AND id > $cursor ORDER BY id LIMIT $limit + 1`; the response has
  `items` and `nextCursor` (the last id, or `null` on the last page). Indexes:
  `(category_id, id)`, `(brand_id, id)` and the primary key, all partial on live rows.
- **Why:** the cost of a page does not grow with its depth, unlike `OFFSET`.
- The category tree is not paged: it is returned whole (hundreds of nodes) — the one
  exception, stated in the spec.

## R-7. What the database enforces, and what the service does (FR-040, US-4)

- **Database (CHECK, NOT NULL, FK, partial unique):** lengths of names, codes, SKUs
  and slugs; slug and SKU formats; `price_cents > 0`; `stock >= 0`; attribute type in
  the five types and its limits consistent (`min <= max`, a list type has values);
  `specs` is a JSON object; `parent_id <> id`; every reference; uniqueness among live
  rows; a former slug unique per kind.
- **Service, inside one transaction with row locks (R-5):** rules that read other rows
  — no cycles in the tree, products only in leaves, specs against the attributes of the
  category and its ancestors, attribute codes unique along a path, a slug not held by
  another entity's history, attribute changes that would break stored products.
- **Why not triggers for the second group:** each would restate in PL/pgSQL a rule the
  service already has to check to answer with a precise `400` / `409`; two copies of
  the rule drift. The spec's FR-040 is reworded to say this split.

## R-8. Specs validation (FR-011, FR-023, US-3)

- **Decision:** a pure function `validateSpecs(attributes, specs)` in catalog-service
  returns every problem as `{ field: 'specs.<code>', messages }`, the format of
  TASK-3's `errors[]`. Rules: unknown code, missing required, wrong JSON type (a number
  sent as `"8"` is wrong), a value outside the allowed list, a number outside the
  range or not whole when whole numbers are required, a text longer than its limit,
  duplicate values in a multi-select.
- **Rejected:** JSON Schema with ajv — a new dependency, and its messages would have to
  be mapped back to attribute names anyway.

## R-9. Attribute changes once products exist (FR-013)

- **Decision:** the attributes of a category are replaced as a whole
  (`PUT /admin/categories/{id}/attributes`, with the category's version). The service
  computes the new effective attributes of every category in the subtree, streams the
  specs of their live products in batches of 1 000 and validates each; any failure →
  `409` "N products would have invalid specs", nothing stored. A move to another
  parent is checked the same way.
- **Why:** one rule (R-8) decides validity, so the check can't disagree with what a
  product write would accept. Changes are rare admin actions; validating a subtree of
  even 100 000 products takes about a second.

## R-10. Former slugs (FR-025)

- **Decision:** table `former_slug (kind, slug, entity_id, retired_at)`, unique on
  `(kind, slug)`. Changing a slug moves the old one there in the same transaction. A
  new slug is refused when it is a former slug of another entity of that kind; a
  former slug of the same entity can be taken back (it leaves the table). Lookups by
  slug check the live rows, then `former_slug`; the response is the entity, whose
  `slug` is the current one.
- A deleted entity keeps its former slugs (old links still point to it and answer
  "gone" on the storefront), but its current slug is free (FR-030).

## R-11. Gateway: the admin API (FR-050, FR-051)

- **Decision:** api-gateway declares every admin endpoint as its own controller method
  with the shared DTOs (OpenAPI, input validation), and forwards it through one
  `CatalogClient.forward()` that:
  - sends the method, path, query, body, `If-Match` and the correlation id;
  - passes a `2xx` back with its body and `ETag`;
  - passes a `4xx` problem back unchanged (status, body), because the catalog's answer
    (`400` with specs errors, `404`, `409`, `412`, `428`) is the answer;
  - turns a `5xx`, a timeout or an unreachable catalog into `502` / `503` as today.
- **Why:** the public contract stays explicit in the gateway's OpenAPI (ADR 0014), the
  gateway stays the only door TASK-7 has to guard, and no catalog logic moves into the
  gateway. A blind reverse proxy would leave the gateway's OpenAPI empty.
- This rule outlives the task (identity and order will be forwarded the same way):
  **ADR 0021**.

## R-12. Migration of the TASK-2 database (FR-041, FR-042)

- **Decision:** Drizzle migrations generated from `schema.ts`, plus one custom
  migration for `uuid_v7()`. `category` gains `parent_id`, the audit columns,
  `version`, `deleted_at` and CHECK constraints; existing rows already satisfy them
  (the seed names and slugs). The unique constraint on `slug` becomes the partial
  index. The seed stays idempotent and keeps its six top-level categories.
- Tested both ways: from an empty database, and from the TASK-2 schema with its seed
  rows (migrate to TASK-2's last migration, insert, then migrate to the end).

## R-13. Public category list (FR-014)

- `CategoryDto` gains `parentId: string | null`; the public list returns live
  categories only. The web home page keeps listing them as it does now (no change in
  web); the gateway's `whitelist` passes the new field once the shared DTO has it.

## R-14. Tests

- Unit: `validateSpecs` (every type and rule), the attribute-change check, ETag / If-Match
  parsing, the cursor.
- Integration (Testcontainers, the real migrations): every endpoint's happy path and
  its `400` / `404` / `409` / `412` / `428`; soft delete and restore in every list;
  the CHECK constraints by inserting bad rows with SQL (AC #4); the upgrade from the
  TASK-2 schema; concurrent writes (two updates with one version → one `412`).
- Gateway: forwarding of status, body, `ETag` / `If-Match`, problem bodies; the OpenAPI
  lists every admin path.
- NFR-001: a test fills 100 000 products with one `INSERT … SELECT generate_series`
  and measures the median of 200 product creates and updates; run on demand, not in CI.

## R-15. Database roles: least privilege (FR-043)

- **Decision:** two roles per service database.
  - `catalog` — the owner (the image's `POSTGRES_USER`, a superuser locally). Used only
    by the migration step (`pnpm --filter catalog-service db:migrate`), which applies
    the migrations, then the idempotent seed. Its URL is `CATALOG_MIGRATION_URL`.
  - `catalog_app` — the role the running service logs in as (`CATALOG_DATABASE_URL`):
    `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`, `CONNECTION LIMIT 20`,
    `statement_timeout = 5s`, `search_path = public`. Grants: `CONNECT` on the
    database, `USAGE` on the schema, `SELECT, INSERT, UPDATE` on the catalog tables,
    `EXECUTE` on `uuid_v7()`. No `DELETE` (deletion is soft), no `TRUNCATE`, no
    `CREATE`. `ALTER DEFAULT PRIVILEGES` gives the same rights on tables later
    migrations add.
- **Where the role comes from:** a migration creates `catalog_app` as `NOLOGIN` if it
  does not exist and grants the rights; the migration step then sets its password
  from `CATALOG_APP_PASSWORD` and `LOGIN` (a password does not belong in a committed
  migration). On a managed database the role may already exist: the step only
  updates the password then.
- **The service no longer migrates on start.** `pnpm dev` runs `db:migrate` before the
  apps; CI and Testcontainers do the same with the owner, then start the service with
  `catalog_app`, so every integration test runs with the production rights.
- **Also:** the database ports in `docker-compose.yml` bind to `127.0.0.1` only, for
  all three databases (the local network no longer reaches them).
- **Rejected:** Row-Level Security — it separates tenants; the shop has one, and
  tenants belong to B2B, which the MVP does not have.
- Tests: `catalog_app` cannot `DELETE`, `TRUNCATE`, `DROP`, `CREATE TABLE` or read
  `pg_authid`; the service starts and serves with it.
