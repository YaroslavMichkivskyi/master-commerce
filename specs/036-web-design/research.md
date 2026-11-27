# Research: Web design

Decisions behind [plan.md](plan.md). Each one names the requirement it serves.

## R-1 Styling: Tailwind CSS v4 with our own components (FR-001, FR-003, FR-004)

**Decision.** Tailwind CSS 4.3.5 through `@tailwindcss/postcss` 4.3.5. The tokens are
CSS custom properties declared in Tailwind's `@theme` (colour, type scale, spacing,
radius, shadow, breakpoints), so every utility and every hand-written rule reads the
same variables. Components are our own React server components in `components/ui/`
(primitives) and `components/shop/` (shop parts). No component library.

**Options weighed** (owner's choice, 2026-11-27):
- Tailwind v4 + own components — zero run-time JavaScript, works in server components,
  tokens are plain CSS variables (the dark theme only swaps their values).
- Tailwind v4 + shadcn/ui (Radix) — polished accessible parts fast, but its menu,
  drawer, select and dialog are client components that need JavaScript; the
  filters, phone drawer and mega-menu must work without it (FR-013), so each would
  need a second, no-JS version. May still be used for admin dialogs in TASK-12.
- CSS Modules + own tokens — no dependency, most hand-written CSS.

**Rules.** Raw colours, sizes or breakpoints live only in `app/theme.css`. Tailwind
arbitrary values (`bg-[#123]`, `w-[37px]`) in `className` are rejected by an ESLint
`no-restricted-syntax` rule; `globals.css` holds only `@import`s and the base layer.
Class names are joined with a 5-line `cx()` helper — no `clsx`, no `tailwind-merge`.

Recorded in **ADR 0024** (styling).

## R-2 Colours and look (FR-001, FR-006)

**Decision.** Neutral surfaces in both themes (near-white / near-black with a slight
cool tint, not pure grey), text at ≥ 7:1 where possible, two saturated accents:
- primary accent: electric violet-blue (buttons, links, focus ring, active filters);
- secondary accent: neon cyan / lime for "in stock", sale and highlights;
- a primary → secondary gradient only on large accents (logo mark, hero band), never
  behind text — its cyan / lime end is too light for white or dark text alike, so the
  primary button darkens on hover instead.
Exact values are picked in the tokens step and every text / background pair is
checked for 4.5:1 (text) and 3:1 (UI parts, focus ring) in both themes by a unit test
that computes WCAG contrast from the token values, so a later token change cannot
silently break AA. Density: base text 16 px, 1.5 line height, card grid gap 16–24 px,
a maximum content width of 1440 px.

## R-3 Theme: device setting plus a switch (FR-005)

**Decision.** `data-theme="light|dark"` on `<html>`. A tiny inline script at the top
of `<head>` reads `localStorage.theme` (`light` | `dark` | absent = device) and sets
the attribute before the first paint, so no page flashes the other theme. Without
JavaScript the attribute is absent and CSS falls back to `prefers-color-scheme`. The
switch is a small client component (three states: light, dark, device) shown only
when JavaScript runs.

**Why not a cookie.** A cookie read on the server makes every page per-request and
defeats the page cache (R-5); the inline script keeps pages static.

## R-4 Font: Inter, self-hosted (FR-002)

**Decision.** Inter variable (owner's choice) from `@fontsource-variable/inter` 5.3.0,
the Latin `wght` file loaded through `next/font/local`: preloaded, `font-display:
swap`, with Next's size-adjusted fallback, so swapping causes no layout shift. No
request to Google at build or run time (builds work offline; CI and Docker builds
need no extra network). Tabular figures (`font-variant-numeric: tabular-nums`) for
prices and specs.

## R-5 Rendering strategy (FR-030, NFR-001, NFR-003)

**Today (TASK-6).** Every catalog page reads `searchParams`, so every page is rendered
per request; only the data fetches of unfiltered lists are cached for 300 s. The home
page is `force-dynamic`. That is "SSR with a data cache", not the ISR ADR 0008 intended.

**Outcome of the spike (2026-11-27) — the fallback was taken.** Cache Components turned
`notFound()` and redirects of list pages into `200` responses (a `noindex` page, a
client-side redirect), was slower for unfiltered lists and needs a catalog at build.
Chosen instead, in **ADR 0025** with the measurements: product pages by ISR on demand
(`revalidate = 300`, none at build), lists, search and home per request with the 5-minute
data cache of unfiltered answers; price and stock up to 5 minutes old until TASK-18. The
original proposal is kept below for the record.

**Proposed (rejected).** Enable Next.js **Cache Components** (`cacheComponents: true`, Next
16.4) — a static shell per route, prerendered and kept, with dynamic parts streamed into
the same response — and place each page as follows:

| Page | Shell (static, kept) | Content |
|---|---|---|
| Home | whole page | cached data (`'use cache'`, 5 min) — effectively ISR |
| Category, brand | header, breadcrumbs, heading, layout | the list: no query → cached (5 min), with filters / sort / page → per request |
| Product | header, name, description, specs, images (later) | **price, stock and the JSON-LD offer** per request — the "static shell with fresh price and stock" |
| Search | header | per request (`noindex`) |
| Not-found, error, robots | built once | — |
| Sitemap | unchanged (per request) until TASK-18 | — |

Cached functions get a `cacheTag` per entity (`product:<id>`, `category:<id>`,
`brand:<id>`, `tree`) — the point where TASK-18's on-demand revalidation plugs in; no
revalidation code is written now. A failed catalog call is thrown inside the cached
function, so an error is never cached.

**Why this mix.** A large catalog cannot be built at deploy time (100 000+ product
pages, SSG does not scale); rendering every request wastes the cache on pages whose
content changes rarely; filtered combinations are effectively infinite and must not be
cached. Price and stock are the only product facts that must be fresh, and they are a
small part of the page. Crawlers get the full HTML, streamed in one response.

**Risk and fallback.** Cache Components changes the rules for every route
(`dynamic` / `revalidate` segment options disallowed, `searchParams` must sit under a
`Suspense`). Implementation step 1 is a spike on the category and product pages that
measures TTFB / LCP against today's build. If it fails (a blocking bug, worse numbers),
the fallback is today's model made explicit: unfiltered pages ISR by time through a
query-free route, filtered pages SSR — and the ADR records why.

Recorded in **ADR 0025** (rendering strategy), which **amends ADR 0008** (its "ISR with
on-demand revalidation" becomes this table; on-demand stays TASK-18).

## R-6 Interaction without JavaScript (FR-007, FR-012, FR-013, US-4)

- **Mega-menu**: `<details>` / `<summary>` "Catalog" in the header with a two-level
  panel of links (the tree is already loaded by the layout). With JS a small island
  closes it on `Escape`, outside click and navigation. On a phone the panel is
  full-screen.
- **Phone filter panel**: a `<details>` overlay without JS; with JS the island upgrades
  it to a modal `<dialog>` (focus kept inside while open, `Escape` closes, focus
  returns to the "Filters" button). The button shows the applied-filter count.
  *Built (phase 5):* the island does not move the panel into a `<dialog>` (its nodes are
  rendered by React and the desktop column needs them where they are); it makes the open
  panel modal in place: the rest of the page `inert`, `role="dialog"` + `aria-modal`,
  focus into the panel, `Escape` closes, focus back on the button.
- **Filters** stay links and a GET form as in TASK-6 (price / number ranges submit with
  an "Apply" button); applied filters become removable chips (links).
- **Announcements**: the result heading ("1 234 products") is in a polite live region;
  a navigation that changes it is announced.
- Long facet value lists: first 8 values, the rest in a `<details>` "Show all (N)".

Client components are only: theme switch, menu / drawer enhancer. Everything else is a
server component (NFR-002).

## R-7 Performance budgets (NFR-001, NFR-002)

- Core Web Vitals targets as in the spec; lab proxy = Lighthouse mobile (R-9).
- **First-load JS per route ≤ 150 KB compressed** (Next + React today ≈ 105 KB; the
  rest is our islands). Checked by a Playwright test that sums the compressed size of
  the JavaScript a cold load of each storefront route fetches — it runs with the visual
  tests on every web PR. `next build` no longer prints sizes, and this measures what a
  browser actually downloads.
- No layout shift: fixed aspect-ratio image placeholders (4:3 on cards, 1:1 on the
  product page), the font fallback of R-4, filters rendered on the server (nothing
  inserted after load). A Playwright check reads CLS from the `layout-shift` entries of
  every case.

## R-8 Visual and accessibility tests (FR-040…FR-043)

- **Playwright 1.65.1** (`@playwright/test`) in `apps/web/e2e/`, Chromium only, three
  projects: phone 390 × 844, tablet 768 × 1024, desktop 1280 × 800. `toHaveScreenshot`
  full-page, animations off, caret hidden, after `document.fonts.ready`. Light theme for
  every case; dark for home, category and product.
- **@axe-core/playwright 4.14.1** with tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`:
  zero violations per case.
- **Reproducible screenshots**: fonts and anti-aliasing differ per OS, so the tests
  always run inside the official image `mcr.microsoft.com/playwright:v1.65.1-noble` —
  in CI and locally (Windows / macOS / Linux, Docker required). The app runs on the
  host; the container reaches it through `host.docker.internal` (on Linux with
  `--add-host=host.docker.internal:host-gateway`). One Node script
  (`apps/web/scripts/visual.mjs`) starts it the same way on every OS, with `--update`
  to rewrite the baselines.
- **Data**: the real stack — `postgres-catalog` from Compose, catalog-service and the
  gateway built and started, datagen `--scale 300 --seed visual --reset`, the web app as
  a production build (`next build && next start`). A global setup adds the edge-case
  products through the TASK-4 admin API (a 200-character name, a product out of stock,
  a price `€12,999.99`), so the cases do not depend on what the seed happens to produce.
  The "unavailable" cases use a second `next start` on another port with `GATEWAY_URL`
  pointing at a closed port.
- **CI**: a new workflow `web-visual.yml` on pull requests to `dev` / `main` whose
  changes touch `apps/web/**`, `shared/dto/**` or the workflow itself; uploads the
  Playwright report on failure. The existing `ci.yml` is unchanged.

## R-9 Lighthouse (US-5, NFR-001)

Manual in this task (TASK-14 automates it): `npx lighthouse@13.6.0` with its default
mobile profile against the production build on the visual-test data, category and
product pages, three runs each, median reported in `test-cases.md`. Command in
[quickstart.md](quickstart.md).

## R-10 Web guidelines (FR-031)

`docs/web-guidelines.md`: rendering table and the reasons (R-5, ADR 0025); budgets
(R-7); server components by default, client islands only for interaction and why;
caching rules (what may be cached, tags, errors never cached); SEO rules (the TASK-6
ones as a checklist); accessibility rules (FR-020, the no-JS patterns of R-6); how to
add a component (tokens only, states, a visual case). Linked from `AGENTS.md` (Map +
a rule line) and from `apps/web` README.

## R-11 What is not taken

- Storybook — the visual cases cover the components on real pages; not in the MVP.
- `next-themes` — 20 lines of our own do the same without a dependency.
- Icon library — about ten inline SVG icons (search, menu, close, filter, chevron,
  sun, moon, monitor, check, cart placeholder) as components.
- Visual testing SaaS (Chromatic, Percy) — screenshots stay in the repo.
