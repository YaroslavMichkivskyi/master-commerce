# Implementation Plan: Catalog model

**Branch**: `task-4` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-catalog-model/spec.md`

## Summary

The catalog database gets brands, a category tree with per-category attributes, products
with prices in cents, stock, specs checked against the attributes, publication, soft
delete, audit columns, versions and former slugs. Ids are UUIDv7 made by the database.
catalog-service serves an admin API under `/admin` with conditional writes
(`ETag` / `If-Match`) and cursor-paged lists; api-gateway forwards it under
`/api/v1/admin/catalog`, passing the catalog's problem answers through (ADR 0021). The
database enforces every single-row rule and uniqueness; the service enforces the rules
that read other rows, inside one transaction. The running service has a
least-privilege database role without `DELETE`, `TRUNCATE` or DDL; migrations run as a
separate step with the owner role. Decisions: [research.md](research.md);
tables: [data-model.md](data-model.md); endpoints: [contracts/http.md](contracts/http.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict) on Node.js 24 LTS — as TASK-2

**Primary Dependencies**: none new. Drizzle ORM 0.45.4 + drizzle-kit, `pg` 8.23.1,
NestJS 12.4, `@nestjs/swagger` 12.1, class-validator 0.15.1, service-core (TASK-3).

**Storage**: PostgreSQL 17.11 `catalog` database; new tables `brand`,
`category_attribute`, `product`, `former_slug`; `category` extended; SQL function
`uuid_v7()`.

**Testing**: Vitest 5.1 + supertest; Testcontainers PostgreSQL for catalog; a stub
catalog on a real socket for the gateway — ADR 0019, R-14.

**Target Platform**: as TASK-2 (Windows / macOS / Linux hosts, `ubuntu-24.04` CI)

**Project Type**: monorepo; catalog-service, api-gateway, shared/dto changed

**Performance Goals**: product create / update ≤ 50 ms median with 100 000 products
(NFR-001); a deep list page as fast as the first (FR-034)

**Constraints**: no B2B structures (constitution I); every write conditional (FR-033);
migrations upgrade the TASK-2 database in place (FR-041); the service runs with a
least-privilege role, migrations apart (FR-043)

**Scale/Scope**: 4 new tables, 1 extended; 24 admin endpoints in catalog, the same 24 in
the gateway; 1 public DTO field

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Ordinary shop, no speculative features | pass | an ordinary B2C catalog; no partners, visibility, price lists; history, bulk work and price history left to TASK-30…32 |
| II. Spec is the source of truth | pass, with two rewordings | FR-034 (the category tree is returned whole) and FR-040 (which rules the database holds and which the service holds) are reworded below, before tasks |
| III. Local first, explicit data access | pass | Drizzle for writes and simple reads; recursive CTEs and the specs check in SQL written by hand (ADR 0005) |
| IV. Tests ship with the change | pass | R-14: unit, integration with the real migrations, gateway forwarding, the TASK-2 upgrade |
| V. Observable and documented | pass | every endpoint in both services' OpenAPI; service-core for errors, logs, metrics |
| VI. No scope creep, decisions recorded | pass | ADR 0021 (gateway forwarding), ADR 0022 (data conventions of service databases) |
| VII. Git workflow and approval | pass | branch `task-4`, step-by-step reviewed commits |
| Gate: versions pinned, cross-platform | pass | no new dependency; SQL only |

## Spec changes made with this plan

- **FR-034**: "Every list MUST be paged…" → "Every list of brands and products MUST be
  paged…; the category tree is returned whole." (R-6: hundreds of nodes, and a tree
  cut into pages is not a tree.)
- **FR-040**: the database enforces every rule a row can check by itself (lengths,
  formats, ranges, JSON shape), uniqueness among live rows and every reference; rules
  that read other rows (tree shape, products in leaves, specs against attributes,
  former slugs, attribute changes) are enforced by the service inside one transaction
  with the rows they read locked (R-7).

## Requirement mapping

| Requirement | Design | Verified by |
|---|---|---|
| FR-001, FR-002 | `brand` table; `BrandsController` / service | int: CRUD, restore, 409 slug |
| FR-010 | `category.parent_id`; tree checks under row locks (R-5) | int: cycle → 409; child under a category with products → 409; product in a non-leaf → 409 |
| FR-011 | `category_attribute`, CHECKs per type (data-model) | unit: DTO limits per type; int: bad limits → 400; SQL insert of an inconsistent attribute refused |
| FR-012 | `CategoriesController`: tree, CRUD, move, `PUT …/attributes` | int per endpoint |
| FR-013 | R-9: validate the subtree's products against the new attributes | int: required added / value removed / range narrowed / move → 409 with the count; optional added → 200 |
| FR-014 | `CategoryDto.parentId`; live rows only (R-13) | catalog + gateway int: public list has `parentId`, no deleted rows |
| FR-015 | effective attributes = ancestors' + own; code unique along the path | unit; int: repeated code → 409 |
| FR-020 … FR-022 | `product` table, CHECKs | int; SQL inserts refused (AC #4) |
| FR-023, US-3 | `validateSpecs` (R-8) on create, update, category change | unit: every rule; int: 400 lists every attribute |
| FR-024 | `ProductsController`: CRUD, publish, unpublish, filters | int |
| FR-025 | `former_slug` (R-10); `by-slug` lookups | int: rename then lookup by the old slug; another entity can't take it → 409 |
| FR-030 | `deleted_at`, partial uniques (R-3) | int: deleted absent from every read and list; restore; slug / SKU free after delete |
| FR-031 | audit columns incl. `deleted_by`, `*_by` null | int: timestamps change on update, delete and restore |
| FR-032 | service-core problem filter; specs errors as `errors[]` | int |
| FR-033 | `version`, `ETag`, `If-Match` (R-4) | int: stale → 412, missing → 428, two concurrent updates → one 412 |
| FR-034 | cursor paging (R-6) | int: pages cover the list once, in order; `nextCursor` null at the end |
| FR-035 | `uuid_v7()` default (R-1) | int: ids of rows inserted in sequence sort in insertion order |
| FR-040, US-4, AC #4 | CHECK / FK / partial unique (data-model) | int: a bad row per rule inserted by SQL is refused |
| FR-041, FR-042, AC #3 | Drizzle migrations + custom `uuid_v7` (R-12) | int: from empty; from the TASK-2 schema with its seed rows |
| FR-043 | roles `catalog` / `catalog_app`, `db:migrate` step, no migration on start (R-15) | int: every test runs as `catalog_app`; it cannot `DELETE`, `TRUNCATE`, `DROP`, `CREATE TABLE`; quickstart: `pnpm dev` migrates, then starts |
| FR-050, FR-051 | gateway admin controllers + `CatalogClient.forward()` (R-11) | gateway int: status / body / ETag pass-through, 5xx → 502, down → 503; OpenAPI paths |
| NFR-001 | indexes (data-model), one transaction per write | on-demand benchmark (R-14), result in the task notes |
| US-1 … US-5 | as the FRs they rest on | AC #1 by an int test that follows US-1 and US-2 end to end through the gateway |

## Project Structure

### Documentation (this feature)

```text
specs/004-catalog-model/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/http.md
├── quickstart.md        # with the tasks: US-1 → US-5 by curl through the gateway
└── tasks.md             # next: speckit-tasks
```

### Source Code

```text
shared/dto/src/
  catalog-admin/          # brand, category, attribute, product DTOs; page wrapper
  category.dto.ts         # + parentId
apps/catalog-service/
  drizzle/                # 0001 role catalog_app and its grants (custom),
                          # 0002 uuid_v7 (custom), 0003 catalog model (generated)
  src/db/migrate.ts       # the db:migrate step: migrations, app role password, seed
  src/db/schema.ts        # brand, category, category_attribute, product, former_slug
  src/admin/
    brands/  categories/  products/     # controller + service each
    specs.ts                            # validateSpecs (R-8)
    versioning.ts                       # If-Match / ETag, conditional update (R-4)
    paging.ts                           # cursor (R-6)
    slugs.ts                            # former slugs (R-10)
  test/                   # integration, incl. migration-upgrade and constraints
apps/api-gateway/
  src/catalog/catalog.client.ts         # + forward()
  src/catalog/admin/                    # brands, categories, products controllers
docs/adr/0021-gateway-forwards-service-apis.md
docs/adr/0022-service-database-conventions.md
```

## Docs touched in this task

- ADR 0021 (gateway forwarding, R-11) and ADR 0022 (UUIDv7, money in cents, soft
  delete with partial uniques, versions with `If-Match`, cursor paging, audit
  columns, least-privilege roles with migrations apart — R-1…R-4, R-6, R-15), index
  and roadmap table.
- `docker-compose.yml`: database ports on `127.0.0.1`; `.env.example`:
  `CATALOG_MIGRATION_URL`, `CATALOG_APP_PASSWORD`, `CATALOG_DATABASE_URL` with
  `catalog_app`; the dev preflight runs `db:migrate`; CI the same.
- `docs/technologies.md`: rows for UUIDv7 ids, conditional requests, cursor paging;
  the PostgreSQL row gains JSONB specs and partial indexes.
- README: the admin API paths.

## Decided with the owner

- Deletion is `deleted_at` + `deleted_by`, no boolean (R-3).
- Least-privilege roles, migrations as a separate step (R-15, FR-043).

## Complexity Tracking

None.
