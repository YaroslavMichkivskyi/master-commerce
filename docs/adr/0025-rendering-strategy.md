# 0025. Rendering strategy: product pages by ISR, lists per request with a data cache

- Status: accepted
- Date: 2026-11-27
- Deciders: project owner

## Context and problem statement

TASK-36 (`specs/036-web-design/`, FR-030) has to fix how each storefront page is rendered
and cached, for a catalog of 100 000+ products. ADR 0008 chose "SSR / ISR with on-demand
revalidation for product pages", but TASK-6 rendered every catalog page per request,
caching only the catalog answers of unfiltered lists for 5 minutes. The pages also carry
SEO behaviour that depends on real HTTP statuses (TASK-6 FR-034, edge cases): an old slug
answers a permanent redirect (308), an unknown one 404, a refused filter a redirect to the
valid address, an unavailable catalog a 5xx.

Measured on the local stack, 90 002 generated products, production build, 20 requests per
address (median warm / first request, total response time):

| Address | TASK-6 (per request + data cache) | Cache Components spike | Chosen |
|---|---|---|---|
| `/` | 7.5 / 198 ms | 2.7 / 99 ms | as TASK-6 |
| `/c/graphics-cards` | 8.0 / 169 ms, 69 KB | 24.5 / 290 ms, 115 KB | as TASK-6 |
| `/c/graphics-cards?brand=asus&sort=price-asc` | 93.5 / 153 ms | 101.6 / 118 ms | as TASK-6 |
| `/p/<slug>` | 5.2 / 16 ms | 47.0 / 57 ms (fresh price part) | **2.8** / 174 ms, ISR `HIT` |
| `/c/does-not-exist` | **404** | **200** + `noindex` | **404** |
| `/c/graphics-cards?page=abc` | **307** | **200** + client-side redirect | **307** |

## Considered options

- **Next.js Cache Components** (partial prerendering): a static shell per route, kept,
  with dynamic parts streamed into the same response; price and stock fresh on product
  pages. Built and measured as a spike.
- **Static generation of every page at build** — 100 000+ pages per deploy, and a build
  would need the catalog; does not scale.
- **Everything per request** (TASK-6 as it was) — correct, but product pages, the most
  numerous and most visited by search engines, are rendered again on every visit.
- **Product pages by ISR on demand, lists and search per request with the 5-minute data
  cache of unfiltered answers.**

## Decision

The last option:

| Page | Rendering | Cache |
|---|---|---|
| Product `/p/<slug>` | ISR on demand: none at build, rendered on the first visit, kept, re-rendered in the background at most every 5 minutes (`revalidate = 300`, `generateStaticParams` → `[]`) | the page |
| Category, brand (unfiltered) | per request | catalog answer, 5 minutes (data cache) |
| Category, brand (filtered, sorted, paged), search | per request | none |
| Home | per request (a build has no catalog to ask) | catalog answers, 5 minutes |
| Not-found | built once | — |
| robots, sitemap | per request (`SITE_URL` of the running app; parts follow the catalog) | sitemap index and pages file: catalog answer, 5 minutes |

Cache Components is **rejected for now**: with a prerendered shell the response starts
before the page decides its status, so `notFound()` and `redirect()` /
`permanentRedirect()` inside a list page become a `200` with `noindex` or a client-side
redirect, even with `instant = false` on the page — a regression of TASK-6 FR-034 and of
the 404 / 5xx behaviour for search engines. It was also slower for unfiltered lists (the
shell plus the streamed payload) and needs a catalog at build time for
`generateStaticParams`. The "static shell with fresh price and stock" it would give
product pages is not worth those costs while prices refresh within 5 minutes (TASK-6
FR-035) and on change later (TASK-18).

For the same reason **no page is streamed**: no `loading.tsx` and no `<Suspense>` around
the data a page decides its status on. A streamed response sends `200` with its first
byte, before the page knows it is a `404` or a redirect. The cost: on a slow catalog the
visitor keeps seeing the previous page (with the browser's loading indicator) until the
next one arrives whole, instead of a shell with a skeleton; a page that arrives is never
reshaped afterwards. Added at the owner's review of TASK-36 phase 6 (2026-11-28), when a
loading skeleton was built and removed.

## Consequences

- Product pages cost one render per 5 minutes per product instead of one per visit; a
  product page keeps being served from the cache while the catalog is briefly down (the
  background re-render fails and the kept page stays).
- An unknown product slug is cached as a `404` for up to 5 minutes, so a product
  published at that slug appears within that time — the same bound as a price change.
- Every address renders a cache entry, a made-up one too, so the cache is kept in memory
  only (`experimental.isrFlushToDisk: false` in `apps/web/next.config.ts`): Next's LRU of
  50 MB, oldest entries dropped first, nothing written to disk. A restart starts with an
  empty cache. Limiting how fast one client may ask is the job of the gateway and the edge
  (TASK-25, TASK-34). Added after the AI review of TASK-36 (2026-11-28).
- Price and stock on product pages may be up to 5 minutes old, until TASK-18 revalidates
  pages on change (`revalidatePath` of the product address) — the next step of this
  decision: ISR kept, plus revalidation on price and stock change events (the event bus of
  TASK-8, stock of TASK-11). Whatever
  a cached page says, the cart and checkout check stock again before an order and tell the
  customer plainly when an item is gone (to be specified in TASK-9 and TASK-10).
- A slow or failing catalog is seen as a slow page or the error page, never as a page
  shell with a skeleton that later turns into a 404 (no streaming, above).
- Lists stay per request: they follow the address, and their statuses stay real.
- Revisit Cache Components when Next.js can set the status of a prerendered route
  before streaming (or when a list's redirects and 404s move to the proxy), and for
  pages without status decisions (cart, account) from TASK-9 on.
- `app/rendering.test.ts` pins these choices; changing one means changing this ADR.
- Amends ADR 0008: its "ISR with on-demand revalidation for product pages" is this table;
  on-demand revalidation stays in TASK-18.
