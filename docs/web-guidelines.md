# Web guidelines

The rules every change to the web app (`apps/web/`) keeps: how pages are rendered and
cached, the budgets, SEO and accessibility, how components are built and tested. Set by
TASK-36 (`specs/036-web-design/`); the reasons are in the ADRs linked below. A change
that breaks a rule changes this file and its ADR in the same PR.

## Rendering and caching

| Page | Rendering | Cache |
|---|---|---|
| Product `/p/<slug>` | ISR on demand: none at build, rendered on the first visit, kept, re-rendered in the background at most every 5 minutes | the page |
| Category, brand without a query | per request | the catalog answer, 5 minutes (data cache) |
| Category, brand with filters, sort or page; search | per request | none |
| Home | per request | catalog answers, 5 minutes |
| Not-found | built once | — |
| `robots.txt`, sitemaps | per request | sitemap index and pages file: 5 minutes |

- Decided in ADR [0025](adr/0025-rendering-strategy.md) (amends ADR
  [0008](adr/0008-nextjs-app-router-ssr-isr.md)); `apps/web/app/rendering.test.ts` pins it.
- **Pages are sent whole, never streamed** — no `loading.tsx`, no `<Suspense>` around data
  a page decides its status on. The HTTP status goes out with the first byte; a streamed
  page would answer `200` before it knows it is a `404` or a `308` (a soft 404 and a
  client-side redirect for search engines). Statuses stay real: unknown slug `404`, old
  slug `308` to the current one with the same query, refused filter `307` to the valid
  address, catalog down `5xx`.
- Every catalog call goes through `apps/web/lib/catalog.ts`: a 3-second timeout, one
  request per address and render (React `cache()`), an `Answer` with `ok` / `not-found` /
  `invalid` / `unavailable`. Only answers without a query go to the data cache
  (`revalidate = 300`); anything with a query is `no-store`. A failed or timed-out call is
  never stored; a page that cannot reach the catalog throws `CatalogUnavailableError`, so
  the answer is a `5xx` with the designed error page.
- No cookie or header is read while rendering a catalog page: one HTML for everyone keeps
  ISR and the data cache working. Per-visitor state (the theme) lives in the browser.
- Prices and stock on a cached page may be up to 5 minutes old. On-demand revalidation
  when they change is TASK-18 (on the events of TASK-8 and TASK-11); cart and checkout re-check stock
  themselves before an order (TASK-9, TASK-10).

## Server components first, small client islands

- A component is a server component unless it needs the browser. Client components
  (`'use client'`) are islands that only add behaviour to HTML that already works:
  `ThemeSwitch`, `MenuEnhancer`, `FilterPanelEnhancer`, `AutoSubmit`
  (`apps/web/components/shop/`).
- **Everything works without JavaScript**: filters are links, ranges and the sort are
  GET forms (the sort's "Apply" button is in `<noscript>`), the catalog menu and the phone
  filter panel are `<details>`, search is a GET form. With JavaScript the islands add
  `Escape`, outside click, focus handling, a modal panel, applying the sort on pick.
- Every state of a list lives in the address (`apps/web/lib/query.ts`): a filter change
  goes back to page 1; the links of chips, facets and pages keep the rest of the query.

## Budgets

| What | Budget | Checked by |
|---|---|---|
| First-load JavaScript per storefront route, compressed | ≤ 150 KB (today ≈ 135 KB) | `apps/web/e2e/budget.spec.ts` |
| Layout shift after load | CLS ≤ 0.1 (today 0) | `apps/web/e2e/budget.spec.ts` |
| Requests to other origins | none (the Inter font is self-hosted) | `apps/web/e2e/budget.spec.ts` |
| Lighthouse, mobile, category and product | performance ≥ 90, SEO 100, accessibility ≥ 95 | by hand, `specs/036-web-design/quickstart.md` |

No shift: images have a fixed-ratio place (`ImagePlaceholder`, 4:3 on cards, 1:1 on the
product page), the font swaps from Next's size-adjusted fallback (`app/fonts.ts`), filters and
chips are rendered on the server, an island renders a place of its final size before it
mounts.

## SEO (TASK-6, keep as is)

- `generateMetadata` on every page: title, description, canonical URL (`lib/seo.ts`).
- `noindex, follow` on a list address with any query but the page number, and on
  search; filter, chip and facet links are `rel="nofollow"`.
- JSON-LD: `Product` on product pages, `BreadcrumbList` on lists and products, escaped
  by `jsonLd()` (`components/shop/json-ld.tsx`).
- `robots.txt` and sitemaps in parts, built from `SITE_URL`.
- Real statuses (see above). `app/seo.test.tsx` covers all of it.

## Accessibility (WCAG 2.2 AA)

- Landmarks on every page: header (banner), the catalog `nav`, one `<main id="main">`
  (in the layout, the skip link's target), footer; one `h1` per page.
- Every control has a name: a visible `<label>` or `aria-label`; icons are `aria-hidden`
  unless they are the only content (then they carry a `title`).
- Focus is always visible (one ring from `--color-focus`); targets are at least 24 × 24 px;
  nothing is told by colour alone (stock: a word and an icon).
- The result count is a polite live region; chips say what they remove.
- The phone filter panel is modal while open (the rest `inert`, `Escape` closes, focus
  returns to its button) and traps nothing once closed.
- `apps/web/e2e/` runs axe (WCAG 2.0–2.2 A / AA) on every visual case: zero violations.

## Look: tokens and components

- Tailwind CSS v4 with our own components (ADR [0024](adr/0024-styling-tailwind-own-components.md)).
  Colours, fonts, radii, shadows and breakpoints are tokens in `apps/web/app/theme.css`,
  every colour a `light-dark()` pair. **No raw values in class names**: ESLint refuses
  Tailwind arbitrary values (`w-[37px]`, `bg-[#123]`); a missing value is a new token.
  `app/theme.test.ts` checks the contrast of every text and UI pair in both themes.
- Theme: the device's on the first visit, stored in `localStorage` and kept; the header
  switch toggles light / dark (`lib/theme.ts`, an inline head script, so no frame of the
  other theme). Without JavaScript the device's theme applies.
- Build from the primitives in `apps/web/components/ui/` (button, fields, select, badge,
  price, checkbox, placeholder, icons) and the shop parts in
  `apps/web/components/shop/`. A new component: tokens only; its states (hover, focus,
  disabled, error); keyboard and screen-reader names; a Vitest render test; on a page, a
  visual case.

## Tests of the web app

| What | Where | Run |
|---|---|---|
| Unit and render tests (Vitest, server rendering) | `apps/web/**/*.test.ts(x)` | `pnpm --filter web test` |
| Visual (screenshots at phone 390, tablet 768, desktop 1280; dark for home, category, product), axe, no-JS, budgets | `apps/web/e2e/` | `pnpm --filter web test:visual` (Docker only); CI `web-visual.yml` on web PRs |

The visual tests run wholly in Docker (`apps/web/e2e/compose.yaml`): their own Postgres,
the generated catalog plus edge cases (`e2e/seed.mjs`), the services, the shop, and
Chromium in the official Playwright image, so screenshots are the same on every machine.
A deliberate visual change: `pnpm --filter web test:visual --update`, review the changed
PNGs in the diff, commit them with the change. Cases and their numbers:
`specs/036-web-design/test-cases.md`.
