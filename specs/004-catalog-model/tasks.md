# Tasks: Catalog model

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/http.md](contracts/http.md)
**Tests**: required (constitution IV); each step ships with its tests.
Each phase is one or more reviewed commits (`start-task.md` step 6).

## Phase 1 — Database roles and the migration step (FR-043, R-15)
- [x] T001 [P] `docker-compose.yml`: the three database ports bind to `127.0.0.1`
- [x] T002 `apps/catalog-service/src/db/migrate.ts` + `db:migrate` script: migrations,
  then the `catalog_app` password and `LOGIN`, then the seed; `prepareDatabase` no
  longer migrates or seeds on start; `CatalogEnv`: `CATALOG_MIGRATION_URL` (migrate
  only), `CATALOG_APP_PASSWORD`; `.env.example`; the dev preflight runs `db:migrate`
  before the apps; CI the same
- [x] T003 migration `catalog_app` role (custom): create `NOLOGIN` if missing, grants,
  default privileges, `statement_timeout`, connection limit
- [x] T004 Testcontainers harness: migrate as the owner, run the service as
  `catalog_app`; tests that it cannot `DELETE`, `TRUNCATE`, `DROP`, `CREATE TABLE`

## Phase 2 — Schema (FR-030…FR-035, FR-040…FR-042, R-1…R-3, R-12)
- [x] T005 migration `uuid_v7()` (custom); test: ids made in sequence sort in order
- [x] T006 `schema.ts`: common columns, `brand`, `category` extended,
  `category_attribute`, `product`, `former_slug`; CHECKs and partial indexes
  (data-model); generated migration; tests: from empty, upgrade from the TASK-2 schema
  with its seed rows, one bad row per CHECK refused (AC #3, AC #4)
- [x] T007 `CategoryDto.parentId`; the public list returns live categories with it;
  gateway and catalog tests (FR-014)

## Phase 3 — Admin building blocks (FR-033, FR-034, FR-025, R-4, R-6, R-10)
- [x] T008 `shared/dto/src/catalog-admin/`: page wrapper, brand, category, attribute,
  product DTOs with OpenAPI and validation (per-type attribute limits)
- [x] T009 `src/admin/versioning.ts` (`If-Match` / `ETag`, conditional update → `412` /
  `428`), `paging.ts` (cursor), `slugs.ts` (former slugs, lookup by any slug); unit
  tests

## Phase 4 — Brands (FR-001, FR-002, US-5)
- [x] T010 `src/admin/brands/`: create, list, read, by-slug, update, delete (`409` when
  live products use it), restore; integration tests incl. `412`, `428`, former slug

## Phase 5 — Categories and attributes (FR-010…FR-015, US-1, R-5, R-8, R-9)
- [x] T011 [P] `src/admin/specs.ts`: `validateSpecs` and effective attributes; unit
  tests for every type and rule
- [x] T012 `src/admin/categories/`: tree, create, read, by-slug, update, move (cycle,
  new parent with products), delete (children, products), restore; integration tests
- [x] T013 `PUT /admin/categories/{id}/attributes`: replace as a set, codes unique along
  the path, the subtree's products validated (R-9) → `409` with the count; the same
  check on a move; integration tests

## Phase 6 — Products (FR-020…FR-025, US-2, US-3)
- [x] T014 `src/admin/products/`: create (leaf category, live brand, specs), list with
  filters and cursor, read, by-slug, update (incl. a category change), publish,
  unpublish, delete, restore; integration tests incl. the specs error body and two
  concurrent updates → one `412`

## Phase 7 — Gateway (FR-050, FR-051, R-11)
- [x] T015 `CatalogClient.forward()`: method, path, query, body, `If-Match`, correlation
  id; `2xx` and `4xx` passed through with body and `ETag`; `5xx` → `502`, down → `503`;
  tests with the stub catalog
- [x] T016 `src/catalog/admin/`: the 24 admin endpoints with the shared DTOs and
  OpenAPI; tests: the OpenAPI lists every admin path, a request goes through
  end to end (US-1 → US-2, AC #1)

## Phase 8 — Docs and verification
- [x] T017 [P] ADR 0021, ADR 0022 + index + roadmap table
- [x] T018 [P] `docs/technologies.md`, `README.md` (admin API, `db:migrate`),
  `quickstart.md` (US-1 → US-5 by curl through the gateway)
- [x] T019 full checks (`format:check`, `turbo run lint typecheck test test:integration
  build --force`), fresh clone, quickstart on Windows, NFR-001 benchmark (R-14); notes
  in TASK-4
