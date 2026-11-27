# Quickstart: validate the storefront

## Prerequisites
- `pnpm dev` runs (it applies migration `0004_storefront_search` too).
- A generated catalog: `pnpm datagen --scale 100k --seed demo --reset` (replaces the
  local catalog; leave `--reset` out to keep yours, and the command refuses instead).
- web on `http://localhost:3000`, gateway on `http://localhost:3001` (ports in `.env`).

The full list of cases with expected results is [test-cases.md](test-cases.md); this is
the short walk-through.

## Scenarios

1. **Browse and narrow down (US-1, AC #3).** Open `http://localhost:3000`, pick
   Components → Graphics cards. Tick two brands and a memory size, set a price range,
   sort by price, go to page 2. The address holds all of it
   (`/c/graphics-cards?brand=asus,msi&memory_size=…&price=300-800&sort=price-asc&page=2`);
   reloading it or opening it in another browser shows the same page. The count next to
   an unticked value is what ticking it gives.

2. **A product (US-2, AC #2).** Open a card. The page shows the breadcrumbs, the price
   with VAT, stock, the description and the specs table. `Ctrl+U`: all of it is in the
   server HTML, with two `application/ld+json` blocks (`Product`, `BreadcrumbList`).

3. **Search (US-3).** Search `rtx 60`: RTX 6060 and 6070 cards first, sorted by
   relevance; brand and category facets narrow the results. `zzzzqqq` → "Nothing found"
   with links to the categories.

4. **Old addresses (US-4).** Rename a category through the admin API
   (`specs/004-catalog-model/quickstart.md`), then
   `curl -sI "http://localhost:3000/c/<old-slug>?page=2"` → `308` with
   `location: /c/<new-slug>?page=2`.

5. **The public API.** `http://localhost:3001/docs` lists the 8 storefront operations
   under `/api/v1/catalog/…`; no token needed:
   ```
   curl -s http://localhost:3001/api/v1/catalog/categories
   curl -s "http://localhost:3001/api/v1/catalog/categories/ssds/products?brand=samsung&stock=in&sort=price-asc"
   curl -s "http://localhost:3001/api/v1/catalog/search?q=rtx%2060"
   curl -s "http://localhost:3001/api/v1/catalog/categories/ssds/products?page=abc"   # 400, errors[]
   ```

6. **What search engines read (US-5).**
   - `http://localhost:3000/robots.txt` — `/search` disallowed, the sitemap named.
   - `http://localhost:3000/sitemap.xml` — `pages.xml` and `products-0.xml`,
     `products-1.xml` for 100 000 products (50 000 addresses each).
   - In the head of `/c/ssds`: a canonical to itself; of `/c/ssds?page=2`: its own
     canonical; of `/c/ssds?brand=samsung`: `noindex, follow` and the canonical of
     `/c/ssds`; of `/search?q=ssd`: `noindex, follow`.

7. **Speed (NFR-001, NFR-002, AC #1).** With the 100 000-product catalog loaded:
   `pnpm --filter catalog-service test:nfr` → P95 of filtered and sorted category lists
   ≤ 200 ms and of searches ≤ 300 ms.
