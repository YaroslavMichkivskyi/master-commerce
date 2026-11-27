# Research: Storefront browse

Decisions behind [plan.md](plan.md). Each says what was chosen, why, and what was
rejected.

## R-1. A storefront API apart from the admin API (FR-001)

- **Decision:** catalog-service gets a public, read-only module under `/storefront/…`,
  next to the admin API (`/admin/…`, TASK-4) and the TASK-2 `GET /categories`. The
  gateway forwards it under `/api/v1/catalog/…` (ADR 0021).
- **Why:** a different audience (anyone), different rules (published only, no audit
  columns, no versions), and a hot path that must stay fast and cacheable; mixing it
  into the admin controllers would blur both.
- **Rejected:** reusing `/admin/products` with a "published" filter — it would expose
  admin fields and the admin paging, and TASK-7 must later guard the admin API alone.

## R-2. Filter and facet query in one statement (FR-002…FR-006, NFR-001)

- **Decision:** one hand-written SQL statement (ADR 0005, measured hot path) per list:
  1. `scope` — live, published products of the category's subtree (ids from a recursive
     CTE) or of the brand, or matching the search;
  2. one boolean column per filter group (`m_brand`, `m_price`, `m_stock`, one per
     attribute filter), computed once per row from `specs` (`specs->>'code' = ANY(…)`,
     `specs->'code' ?| …` for multi-select, a numeric range cast for numbers);
  3. the page: rows where every flag is true, `ORDER BY` the sort with out-of-stock rows
     last, `LIMIT 24 OFFSET …`, plus `count(*) OVER ()` for the total;
  4. the facets: for each group, the values counted over rows where every other flag is
     true (disjunctive), `min` / `max` for numbers and price the same way.
  The service builds the statement from the category's effective attributes, binding
  every value as a parameter; codes and types come from the attribute rows, never from
  the request.
- **Why:** the scope is one category subtree (thousands of rows at 100 000 products,
  tens of thousands for a top category); one pass computing the flags and grouping from
  it is far cheaper than one query per facet group, and plain SQL keeps it measurable.
- **Rejected:** a query per facet (N + 1 scans); a precomputed facet table (needs
  maintenance on every write for little gain at this size); Elasticsearch (ADR 0009).
- **Indexes:** the partial `(category_id, id)` index of TASK-4 for the scope; a new
  partial index `product(category_id) WHERE deleted_at IS NULL AND published` and
  `product(brand_id) WHERE …` for the storefront scope. Specs are read from the rows in
  scope, so no GIN index on `specs` is needed at this scale; measured by NFR-001.

## R-3. Page numbers with a depth limit (FR-005)

- **Decision:** `page` 1…100, 24 per page, `OFFSET (page-1)*24`; the total from
  `count(*) OVER ()` in the same statement. A page beyond the last answers the last
  page's number in the response, so the web shows it.
- **Why:** numbered pages are what customers and crawlers expect; the limit keeps the
  `OFFSET` cost bounded (at most 2 376 rows skipped after sorting the scope).

## R-4. Search document kept by the database (FR-010)

- **Decision:** `product.search tsvector`, weighted: name `A`, brand name `B`, category
  name `C`, description `D`, with the `english` configuration; a GIN index on it (live,
  published). It is set by triggers: on product insert or update of those columns, and
  on a change of a brand's or category's name (updating that brand's / category's
  products). A query becomes `to_tsquery` of its words joined by `&`, the last one as a
  prefix (`60:*`); ranking by `ts_rank` (the field weights).
- **Ranking function, measured (T012):** `ts_rank_cd` (cover density: also rewards the
  words standing close together) cost ~310 ms for the 7 906 matches of `gaming laptop`
  in 100 000 products, `ts_rank` ~23 ms, and pushed the search P95 over NFR-002.
  Product names are a few words long, so proximity adds little to the weights; `ts_rank`
  is used.
- **Why:** the document needs columns of three tables. Triggers keep it right whoever
  writes — the service, the data generator's `COPY`, a manual fix — with the definition
  in one place. ADR 0022 keeps triggers out of *rules* (the service must answer them
  with `400` / `409`); a derived search column is not a rule.
- **Rejected:** a generated column (cannot read other tables); updating it from the
  service only (the generator's `COPY` and manual SQL would leave it stale).

## R-5. Old slugs (FR-008, FR-034)

- **Decision:** the storefront reads by slug answer the entity with its current slug
  when the slug asked for is a former one (TASK-4 R-10). The web compares the two and
  answers `308` (Next's permanent redirect) to the current address with the query
  string kept.
- **Why:** no new mechanism; the API stays a plain read.

## R-6. Web rendering and cache (FR-030…FR-035)

- **Decision:** Next.js App Router server components (ADR 0008). Data is fetched from
  the gateway by a small typed client. Product, category and brand data without
  filters is fetched with `next: { revalidate: 300 }` (5 minutes); a request with
  filters, sort, page or search is fetched with `cache: 'no-store'`. Filters are plain
  links (`<a href>` with the new query), so the pages work without client JavaScript and
  every state has an address.
- **Why:** server rendering for complete HTML (AC #2); links instead of client state
  for shareable addresses (AC #3) and crawlability; on-demand revalidation is TASK-18.

## R-7. Addresses of filters (FR-031)

- **Decision:** web and API use the same query parameters: `brand` (slugs,
  comma-separated), `price` (euros, `min-max`, either side optional), `stock=in`,
  `sort` (`new`, `price-asc`, `price-desc`, `name`, `relevance`), `page`, `q`,
  `category` (search), and one parameter per attribute by its code: values
  comma-separated, a number range as `min-max`. The names `brand`, `price`, `stock`,
  `sort`, `page`, `q` and `category` win over an attribute with the same code.
- **Why:** short, readable, shareable addresses like those of large shops.

## R-8. SEO (FR-040…FR-042)

- **Decision:** Next `generateMetadata` per page (title, description, canonical from
  `SITE_URL`); `robots: noindex, follow` when the query has anything but `page`;
  JSON-LD `Product` (with `Offer`, `InStock` / `OutOfStock`, `priceCurrency: EUR`) and
  `BreadcrumbList` as `<script type="application/ld+json">` (`<`, `>`, `&` escaped);
  `app/robots.ts`; a sitemap index `app/sitemap.xml/route.ts` and its files
  `app/sitemaps/[file]/route.ts` (`pages.xml`, `products-<n>.xml`) reading the storefront
  sitemap endpoints in parts of 50 000 products.
- **Why route handlers, not `generateSitemaps`:** `generateSitemaps` fixes the list of
  files at build time, when there is no catalog to ask (CI, image builds); the index read
  per request always matches the catalog. A product part (~6 MB) is over the data
  cache's 2 MB item limit, so it is fetched per request.
- The metadata and the page of a route ask for the same answer; `lib/catalog.ts` wraps
  the request in React `cache()` so it is made once per render (a fetch with a timeout
  signal is not deduplicated by React itself).

## R-9a. Security of a public, query-heavy API

The storefront API takes free input from anyone; these hold for every endpoint and are
tested:

- **No SQL built from input.** Every value is a bound parameter, attribute codes too:
  `specs ->> $n` takes the code as a parameter, so not even an identifier is spliced in.
  Codes used come from the category's attribute rows, never from the request (an
  unknown parameter is ignored); the sort is chosen from a fixed map of `ORDER BY`
  clauses; `LIMIT` / `OFFSET` are integers the service computes.
- **Search text is reduced to words** (letters and digits, Unicode) before a `tsquery`
  is built from them, so no `tsquery` syntax (`&`, `|`, `!`, `:`, quotes) from the user
  reaches PostgreSQL; an empty result of that is `400`.
- **Bounded work per request:** `q` at most 200 characters and 10 words; at most 50
  values per filter and 30 filters; page at most 100 (a larger one answers page 100); prices
  within what `price_cents` holds; ranges must be numbers; anything
  malformed is `400` with `errors[]`, anything else unknown is ignored. The service
  role's `statement_timeout` (5 s, ADR 0022) stops a runaway query.
- **No data beyond the storefront's:** only published products of live categories and
  brands; no audit columns, versions or ids of deleted rows in answers.
- **Web:** React escapes text; JSON-LD is serialised with `<`, `>` and `&` escaped as
  `<` / `>` / `&`, so a product name cannot close the `<script>`;
  redirects go only to the shop's own paths built from a slug the API answered (it
  matches the slug format), never to an address from the query.
- **Abuse by volume** (scraping, floods) is not this task's: rate limiting is TASK-25,
  protection at the edge is planned with delivery (see the backlog).

## R-9. Tests and measurements

- Catalog unit: building the list statement (parameters, codes from attributes only),
  query → `tsquery`, parsing of filter parameters, the limits of R-9a.
- Catalog integration (Testcontainers + the data generator, 2 000 products): injection
  attempts in every parameter (`' OR 1=1 --`, `tsquery` syntax) change nothing; every
  facet count equals a brute-force count over the same products; sorting with
  out-of-stock last; paging and the total; search ranking and prefixes; unpublished
  and deleted products never appear; old slugs answer the current one; the search
  document follows a brand rename.
- Gateway: the storefront routes forwarded, in OpenAPI, public.
- Web (Vitest, server components rendered with a stubbed gateway): pages, links that
  keep the query, `noindex` / canonical, JSON-LD, redirect of an old slug, 404.
- NFR-001 / NFR-002: an on-demand test (like TASK-4's) with 100 000 generated
  products, measuring P95 of filtered and sorted category lists and of searches.
