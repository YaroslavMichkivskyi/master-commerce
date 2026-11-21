# Tasks: Storefront browse

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/http.md](contracts/http.md)
**Tests**: required (constitution IV); each step ships with its tests.
Each phase is one or more reviewed commits (`start-task.md` step 6).

## Phase 1 — Search document (FR-010, R-4, data-model)
- [x] T001 migration `0004_storefront_search.sql` (custom): `catalog_search_document()`,
  `product.search`, the product / brand / category triggers, the GIN and the two
  storefront indexes, existing rows filled; `schema.ts`; integration tests: the
  document on insert, after a product, brand and category rename, after a data
  generator load; `catalog_app` writes still work
- [x] T002 ADR 0023 (derived data kept by triggers, amends ADR 0022 §7) + index +
  roadmap table

## Phase 2 — Contracts and query building blocks (FR-002…FR-005, FR-010, R-2, R-3, R-7, R-9a)
- [x] T003 [P] `shared/dto/src/storefront/`: list page, facet, card, category tree,
  product, sitemap DTOs with OpenAPI
- [x] T004 `src/storefront/filters.ts`: query parameters → filters against the
  category's attributes (unknown ignored, malformed → `400`, the limits of R-9a);
  `search-query.ts`: words → `tsquery` with a prefix last word; unit tests incl.
  injection strings
- [x] T005 `src/storefront/list-query.ts`: the list statement (scope, per-group flags,
  page with out-of-stock last, total, disjunctive facets, ranges), every value bound;
  unit tests of the statement and its parameters

## Phase 3 — Storefront API (FR-001…FR-011, R-1, R-5)
- [x] T006 `src/storefront/` service, controller, module: tree with counts, category
  and brand lists, search, product by slug (former slugs → current), newest, sitemap;
  OpenAPI; integration tests on a generated catalog: every facet count against brute
  force, sorts, paging, inner categories, search relevance and prefixes, unpublished /
  deleted never shown, old slugs, injection attempts, limits → `400`
- [x] T007 gateway `src/catalog/storefront.controller.ts`: the routes under
  `/api/v1/catalog/…`, forwarded, public; tests with the stub catalog and the OpenAPI
  list

## Phase 4 — Web (FR-030…FR-035, R-6, R-7)
- [x] T008 `lib/catalog.ts` (typed client, cache per case), `lib/query.ts` (address ↔
  filters, links that keep the query and reset the page), components: breadcrumbs,
  facets, product card, pagination, price; unit tests
- [x] T009 pages: home, `/c/[slug]`, `/brands/[slug]`, `/search`, `/p/[slug]`;
  redirects of old slugs, `404`, "unavailable"; tests with a stubbed gateway;
  **then the stack is started with generated data and the pages, both Swagger UIs and
  the rest are opened for the owner to see**

## Phase 5 — SEO (FR-040…FR-042, R-8)
- [ ] T010 `generateMetadata` (title, description, canonical, `noindex` on filters),
  JSON-LD `Product` and `BreadcrumbList` (escaped), `robots.ts`, `sitemap.ts` in parts;
  tests

## Phase 6 — Docs and verification
- [ ] T011 [P] README (storefront, public API), `docs/technologies.md`, `quickstart.md`
- [ ] T012 NFR test (on demand, 100 000 generated products: P95 of filtered / sorted
  lists and of searches); the data generator's load time re-measured with the
  triggers; full checks (`format:check`, `turbo run lint typecheck test
  test:integration build --force`), fresh clone, quickstart on Windows; notes in TASK-6
- [ ] T013 run the test cases ([test-cases.md](test-cases.md), `docs/playbooks/test-cases.md`)
  on the 100 000-product catalog; failures fixed as reviewed steps and re-run; Coverage and
  Result columns updated, the summary line in the PR
