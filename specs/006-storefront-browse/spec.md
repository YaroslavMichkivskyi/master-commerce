# Feature Specification: Storefront browse

**Feature Branch**: `task-6`
**Spec folder**: `specs/006-storefront-browse/`
**Task**: TASK-6 — `backlog/tasks/task-6 - Storefront-browse-filters-facets-search-SSR-pages-SEO.md`
**Mode**: speckit-full
**Status**: Approved (2026-11-21)
**Created**: 2026-11-21
**Input**: "Storefront browse: filters, facets, search, SSR pages, SEO"

---

## Scope

The shop gets its customer-facing catalog: customers browse the category tree, narrow
a category down by brand, price, stock and the attributes of its products, sort and
page through the results, search by words, and open a product page with its specs.
Search engines get pages they can index: complete server-rendered HTML with titles,
descriptions, canonical URLs and structured product data, a robots file and a sitemap.
Old addresses of products, categories and brands, kept by TASK-4, lead to the current
ones. Only published products of live categories and brands are ever shown. Touches:
catalog-service (a public read API and search), api-gateway (forwarding it), web (the
pages), shared DTOs.

---

## User Scenarios

### US-1 — Browse a category and narrow it down
A customer opens "Graphics cards", ticks two brands and "16 GB" memory, sets a price
range, sorts by price and pages through the results.

**Acceptance**
- Given the category page, then it shows the products of the category (and of every
  category under it), how many there are, and filters: brands, price range, "in stock
  only", and the filterable attributes of the category with how many products each
  value would give.
- Given a filter is applied, when another value of the same filter is counted, then its
  count is what the customer gets when ticking it too (values of one filter combine
  with "or"; filters combine with "and").
- Given filters, a sort and a page, when the page is reloaded or the address is sent
  to someone else, then the same products appear with the same filters ticked.
  *(TASK-6 AC #3)*
- Given 100 000 products in the catalog, when a category is filtered and sorted, then
  the answer comes within 200 ms at the 95th percentile on the local stack.
  *(TASK-6 AC #1)*

### US-2 — Open a product
**Acceptance**
- Given a published product, when its page is opened, then the server answers with the
  complete page — name, brand, category path, price with VAT, stock status, description
  and specs by attribute name and unit — and with structured product data for search
  engines. *(TASK-6 AC #2)*
- Given a product that is deleted or unpublished, then its page answers "not found".

### US-3 — Search
**Acceptance**
- Given words such as "rtx 6070 asus", when the customer searches, then products whose
  name, brand, category or description contain them come first by relevance, with the
  same paging, sorting and brand / category filters as a category page.
- Given a search with no match, then the page says so and suggests the categories.

### US-4 — Old links keep working
**Acceptance**
- Given a product, category or brand whose slug was changed, when its old address is
  opened, then it answers a permanent redirect to the current address, keeping the
  query string. *(TASK-6 scope)*

### US-5 — Search engines can index the shop
**Acceptance**
- Given any catalog page, then it has a title, a description and a canonical URL; a
  filtered or sorted page asks not to be indexed and points to the unfiltered one.
- Given the shop, then a robots file and a sitemap list the pages to index: categories,
  brands and every published product.

### Edge Cases
- A filter value or attribute the category does not have, a malformed price range or a
  page beyond the last → the page ignores what does not apply and shows the nearest
  valid result (an empty filter never errors); the API answers `400` for malformed
  input it is sent directly.
- A page number beyond the paging limit → the last page that may be shown, with a
  hint to narrow the filters.
- The catalog is unavailable → the pages answer with an "unavailable" message and the
  right status, never a stack trace (TASK-2 behaviour).
- A category with no published products → its page shows its subcategories and an
  empty state.

---

## Functional Requirements

### Catalog: public read API
- **FR-001** The catalog MUST offer a public, read-only API for the storefront: the
  category tree with product counts, a category page, a brand page, a product by slug,
  and search. Only published products of live categories and brands appear in it.
- **FR-002** A product list MUST take filters: brands (several), price from / to,
  in stock only, and per attribute of the category: values for `select`,
  `multi_select` and `boolean` attributes (several values of one attribute combine
  with "or"; a `multi_select` matches when the product has any of them), and a range
  for `number` attributes. `text` attributes are not filterable.
- **FR-003** A product list MUST answer, with the products, the facets: for brands and
  for each `select`, `multi_select` and `boolean` attribute, every value with the number
  of products it would give with all other filters applied but its own (disjunctive
  counts); for price and each `number` attribute, the lowest and highest value among
  the products matching the other filters.
- **FR-004** A product list MUST be sortable by newest (the default), price ascending,
  price descending and name; search adds relevance (its default). Products out of stock
  always come after the products in stock, in the same order.
- **FR-005** A product list MUST be paged by page number with a fixed page size, and
  answer the total number of products; pages beyond a limit (100 pages) are not served.
- **FR-006** A category page MUST list the products of the category and of every
  category under it; attribute filters are those of the category's effective
  attributes (TASK-4 FR-015), so an inner category filters by what all its leaves share.
- **FR-007** Every list item MUST carry what a product card shows: name, slug, brand,
  price, whether it is in stock, and the values of the category's first few attributes.
- **FR-008** A product read by slug MUST answer the product with its brand, its category
  path (root first), its specs with each attribute's name, type, unit and order, and
  whether it is in stock; an old slug of a product, category or brand MUST answer which
  entity it was and its current slug, so the storefront can redirect (TASK-4 FR-025).

### Search
- **FR-010** Search MUST match products by the words of the query in their name, brand,
  category and description, rank the matches by relevance, accept partial last words
  ("rtx 60" finds "RTX 6060" and "RTX 6070") and ignore case and punctuation.
- **FR-011** Search results MUST be filterable by brand and category and pageable and
  sortable like a category list (FR-002, FR-004, FR-005), with brand and category
  facets.

### Gateway
- **FR-020** The gateway MUST expose the public read API under `/api/v1/catalog/…`,
  documented in its OpenAPI, forwarded with the catalog's answers (ADR 0021), open to
  everyone.

### Web
- **FR-030** The web app MUST have these pages, rendered on the server: home (top
  categories and new products), category (`/c/<slug>`), brand (`/brands/<slug>`),
  product (`/p/<slug>`), search (`/search?q=`).
- **FR-031** Every filter, the sort and the page number MUST live in the page address,
  so a reload or a shared link shows the same result; changing a filter goes back to
  page 1.
- **FR-032** Category and brand pages MUST show breadcrumbs from the category tree, the
  facets with their counts, the products as cards and numbered pagination.
- **FR-033** The product page MUST show the product's name, brand, breadcrumbs, price in
  euros with VAT, stock status, description and a specs table by attribute.
- **FR-034** An old address of a product, category or brand MUST answer a permanent
  redirect (`301` / `308`) to the current address with the same query string; an
  unknown, deleted or unpublished one answers `404`.
- **FR-035** Product, category and brand pages MUST be served from a cache refreshed at
  most a few minutes after a change; filtered, sorted, paged and search pages are
  rendered per request.

### SEO
- **FR-040** Every page MUST have a title and a description; category, brand and
  product pages a canonical URL. A page with filters, a sort or a search is marked
  `noindex, follow` with the canonical of the unfiltered page; numbered pages of an
  unfiltered list are indexable, each with its own canonical.
- **FR-041** The product page MUST carry structured data of type `Product` with name,
  brand, SKU, description, URL and an offer (price, currency, availability), and the
  category and brand pages a breadcrumb list.
- **FR-042** The shop MUST serve `robots.txt` (search pages not indexed) and a sitemap
  of categories, brands and every published product, split into files of at most
  50 000 addresses.

### Non-functional
- **NFR-001** With 100 000 products, a filtered and sorted category list answers within
  200 ms at the 95th percentile on the local stack. *(AC #1)*
- **NFR-002** With 100 000 products, a search answers within 300 ms at the 95th
  percentile on the local stack.

### Key Entities
- The catalog's own (TASK-4). New: a **search document** per product — the text its
  name, brand, category and description give for search, kept in step with them.

---

## Out of Scope
- On-demand revalidation of pages on a change and a sitemap built by a scheduled job —
  TASK-18; this task refreshes pages by time.
- Product images — TASK-16; cards and pages show no images yet.
- Cart and "add to cart" — TASK-9.
- Search suggestions while typing, typo tolerance, synonyms — not in the MVP.
- Reviews, ratings, "popular" sorting — no data for them in the MVP.

## Explicitly Not Restated Here
- Problem responses, correlation ids, metrics, OpenAPI for every endpoint — TASK-3,
  ADR 0014, ADR 0020.
- Gateway forwarding — ADR 0021; database conventions — ADR 0022.
- Hand-written SQL for hot-path queries — ADR 0005; PostgreSQL FTS — ADR 0009;
  server rendering and ISR — ADR 0008.

## Assumptions
- One language, English; prices in euros formatted for the web (`€1,299.99`).
- 24 products per page; at most 100 pages (2 400 products) per list — beyond that the
  customer narrows the filters, as large shops do.
- Pages are refreshed after at most 5 minutes; a changed price shows within that time
  until TASK-18 refreshes pages on change.
- A product card shows the values of the category's first three attributes by sort
  order.
- The home page shows the top-level categories and the 12 newest products.

## Clarifications

### Session 2026-11-21
- Q: How are lists paged? → A: numbered pages with the total count, depth limited
  (FR-005).
- Q: Which filters and counts? → A: as large shops: brand and select / multi-select /
  boolean attributes with disjunctive counts, ranges for numbers and price, an "in
  stock" toggle; text attributes not filterable (FR-002, FR-003).
- Q: Which pages and addresses? → A: `/c/<slug>`, `/p/<slug>`, `/brands/<slug>`,
  `/search?q=`; inner categories list their whole subtree (FR-006, FR-030).
- Q: Products out of stock and sorting? → A: shown and marked, always after products in
  stock; newest, price up / down, name, and relevance for search (FR-004).

---

## Review & Acceptance Checklist
- [x] No implementation details (languages, frameworks, APIs) in requirements
- [x] Every requirement is testable and unambiguous; IDs are stable
- [x] Every US has Given / then acceptance; edge cases listed
- [x] Scope is bounded; Out of Scope names the owning task where relevant
- [x] Matches the backlog task's acceptance criteria
- [x] No speculative features or extension points (mvp-plan.md §2)
- [x] Every new / changed endpoint is listed — the public read API (FR-001, FR-008, FR-010), its gateway forwarding (FR-020)
- [x] No `[NEEDS CLARIFICATION]` markers remain
