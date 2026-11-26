# Implementation Plan: Storefront browse

**Branch**: `task-6` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-storefront-browse/spec.md`

## Summary

catalog-service gets a public, read-only storefront API (`/storefront/…`): the category
tree with counts, category and brand lists with filters, disjunctive facets, sorting
and numbered pages, product by slug, search, newest products and sitemap parts. A list
is one hand-written SQL statement that flags each filter group per row and counts the
facets from the same scope. Search is PostgreSQL FTS over a weighted `tsvector` per
product that database triggers keep in step with the product, its brand and its
category. The gateway forwards the API under `/api/v1/catalog/…`. The web app renders
home, category, brand, product and search pages on the server, with every filter in
the address, metadata, canonical URLs, JSON-LD, robots and a sitemap; old slugs
redirect. Decisions: [research.md](research.md); schema changes:
[data-model.md](data-model.md); endpoints and addresses:
[contracts/http.md](contracts/http.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict) on Node.js 24 LTS — as before

**Primary Dependencies**: none new. NestJS 12.4, Drizzle 0.45.4 + `pg` 8.23.1
(catalog), service-core; Next.js 16.4.5 + React 19.3.1 (web); `datagen` (tests).

**Storage**: the catalog database: `product.search` (`tsvector`), a GIN index, two
partial storefront indexes, search triggers — one custom migration

**Testing**: Vitest; Testcontainers + the data generator for catalog integration tests;
the stub catalog for the gateway; server components rendered with a stubbed gateway
for the web (ADR 0019)

**Target Platform**: as before (Windows / macOS / Linux hosts, `ubuntu-24.04` CI)

**Project Type**: monorepo; catalog-service, api-gateway, web, shared/dto changed

**Performance Goals**: filtered and sorted list P95 < 200 ms, search P95 < 300 ms with
100 000 products (NFR-001, NFR-002)

**Constraints**: hand-written SQL for the list and search queries (ADR 0005); only
published products of live categories and brands; no client JavaScript needed to
filter; no new dependency

**Scale/Scope**: 8 catalog endpoints (+ the same 8 in the gateway); 5 web pages,
robots, sitemap

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Ordinary shop, no speculative features | pass | the usual storefront of a B2C hardware shop; no suggestions, synonyms or popularity without data |
| II. Spec is the source of truth | pass | every FR mapped below; no spec change |
| III. Local first, explicit data access | pass | the list and search statements are hand-written SQL (ADR 0005, research R-2, R-4); Drizzle elsewhere |
| IV. Tests ship with the change | pass | R-9: facet counts checked against brute force on generated data, gateway, web pages, an NFR test |
| V. Observable and documented | pass | every endpoint in both OpenAPI documents; service-core errors and metrics |
| VI. No scope creep, decisions recorded | pass | ADR 0023: derived data kept by triggers (amends ADR 0022 §7, which keeps triggers out of rules) |
| VII. Git workflow and approval | pass | branch `task-6`, reviewed steps |
| Gate: versions pinned, cross-platform | pass | no new dependency |

## Requirement mapping

| Requirement | Design | Verified by |
|---|---|---|
| FR-001 | `src/storefront/` module, published + live only (R-1) | int: unpublished, deleted, product of a deleted brand never listed |
| FR-002, FR-003 | one list statement with per-group flags and facets (R-2) | int: each facet count = brute-force count over the generated products; ranges = min / max of the others |
| FR-004 | `ORDER BY in_stock DESC, <sort>, id` | int: every sort; out-of-stock after in-stock |
| FR-005 | page / offset / `count(*) OVER ()`, limit 100 (R-3) | int: total, page count, last page, page 101 refused |
| FR-006 | subtree ids, effective attributes of the category | int: an inner category lists its leaves' products, filters by shared attributes |
| FR-007 | card with highlights from the leaf's first three attributes | int / unit: highlights by attribute order |
| FR-008 | product by slug with specs by attribute; former slugs answer the current (R-5) | int: specs order and units; old product / category / brand slug |
| FR-010, FR-011 | `product.search` + triggers, prefix `tsquery`, `ts_rank` (R-4) | unit: query → tsquery; int: relevance, prefix, brand rename updates the document, brand / category facets |
| Security (R-9a) | bound parameters only, codes from attribute rows, words-only search, input limits, escaped JSON-LD, own-path redirects | unit + int: injection strings in every parameter, limits → `400`; web: a `</script>` in a name stays inside the JSON-LD |
| FR-020 | gateway controller forwarding `/api/v1/catalog/…` | gateway int: every route, OpenAPI, public |
| FR-030…FR-033 | Next pages under `app/` (R-6) | web: each page renders from a stubbed gateway |
| FR-031 | links built from the current query (R-7) | web: a link keeps the others, a filter change resets the page |
| FR-034 | `permanentRedirect` when the answered slug differs (R-5) | web: an old slug → 308 with the query |
| FR-035 | `revalidate: 300` for unfiltered data, `no-store` otherwise (R-6) | web: the fetch options per case |
| FR-040…FR-042 | `generateMetadata`, JSON-LD, `robots.ts`, `sitemap.ts` (R-8) | web: metadata, `noindex` on filters, JSON-LD content, sitemap parts |
| NFR-001, NFR-002 | R-2, R-4, indexes | on-demand int test with 100 000 generated products: P95 of lists and searches |

## Project Structure

```
shared/dto/src/storefront/          # list, facet, card, product, tree, sitemap DTOs
apps/catalog-service/
  drizzle/0004_storefront_search.sql  # search column, function, triggers, indexes (custom)
  src/db/schema.ts                    # product.search, indexes
  src/storefront/
    filters.ts        # query parameters → filters, validated against the attributes
    list-query.ts     # the list statement (R-2): scope, flags, page, facets
    search-query.ts   # words → tsquery (R-4)
    storefront.service.ts / .controller.ts / .module.ts
  test/storefront.int.test.ts, test/nfr-006.int.test.ts
apps/api-gateway/src/catalog/storefront.controller.ts
apps/web/
  lib/catalog.ts                      # typed gateway client, cache options
  lib/query.ts                        # address ↔ filters, links
  app/page.tsx  app/c/[slug]/  app/brands/[slug]/  app/p/[slug]/  app/search/
  app/robots.ts  app/sitemap.ts  components/ (facets, cards, pagination, breadcrumbs)
docs/adr/0023-derived-data-by-triggers.md
```

## Docs touched in this task

- ADR 0023 (derived data kept by database triggers; amends ADR 0022 §7), index,
  roadmap table.
- README: the storefront pages and the public API; `docs/technologies.md`: PostgreSQL
  FTS (planned → in use), Next.js ISR (time-based), JSON-LD / sitemap (planned → in use).
- `specs/006-storefront-browse/quickstart.md`.

## Decided with the owner

- Numbered pages with the total, depth limited; facets as large shops (disjunctive
  counts, ranges); addresses `/c/`, `/p/`, `/brands/`, `/search`; out of stock shown
  and last.
