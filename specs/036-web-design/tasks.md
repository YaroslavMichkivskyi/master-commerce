# Tasks: Web design

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[quickstart.md](quickstart.md)
**Tests**: required (constitution IV); each step ships with its tests.
Each phase is one or more reviewed commits (`start-task.md` step 6). The Vitest page
tests of TASK-6 (`app/storefront.test.tsx`, `app/seo.test.tsx`) stay green after every
phase — they are the regression suite for behaviour and SEO.

## Phase 1 — Rendering spike and decision (FR-030, R-5)
- [X] T001 spike: `cacheComponents` with shells, `'use cache'` data and a fresh price
  part, built and measured — rejected (soft 404 / redirects, slower lists); fallback:
  product pages by ISR on demand (`revalidate = 300`, `generateStaticParams` → `[]`);
  `app/rendering.test.ts` pins each page's rendering
- [X] T002 measured TASK-6 build vs spike vs fallback on the 90 002-product local
  catalog: response times, statuses, `x-nextjs-cache`, route tables
- [X] T003 ADR 0025 (rendering strategy, amends ADR 0008) with the numbers; ADR 0008
  status; ADR index; roadmap ADR list; research R-5 outcome, plan updated

## Phase 2 — Styling foundation (FR-001, FR-002, FR-004, FR-006, R-1, R-2, R-4)
- [X] T004 dependencies pinned (`tailwindcss`, `@tailwindcss/postcss`,
  `@fontsource-variable/inter`), `postcss.config.mjs`, `app/theme.css` tokens (light /
  dark, accents, type scale, spacing, radius, shadow, breakpoints), `app/globals.css`
  base layer, `app/fonts.ts`; ESLint rule against arbitrary values; `components/ui/cx.ts`;
  the TASK-6 styles moved to `app/legacy.css` until phase 6
- [X] T005 unit test: WCAG contrast of every text / UI token pair in both themes
- [X] T006 ADR 0024 (styling: Tailwind v4 with own components) + index + roadmap list

## Phase 3 — UI primitives (FR-003, FR-020)
- [X] T007 [P] `components/ui/`: button (primary / secondary / ghost, sizes, disabled),
  input, number input, checkbox, range (from / to), badge (stock, count), price
  (tabular, VAT note), skeleton, image placeholder (4:3, 1:1), icons (inline SVG);
  focus ring token, 24 px minimum targets; Vitest render tests (roles, labels, states)

## Phase 4 — Shell (FR-005, FR-007, FR-013, US-3, US-4, R-3, R-6)
- [X] T008 header: logo (text + gradient mark), search form, "Catalog" `<details>`
  mega-menu from the tree (two levels, full-screen on phones), footer; landmarks
- [X] T009 theme: inline head script, `data-theme`, `prefers-color-scheme` fallback,
  two-state switch island (hidden without JS); the first visit's device theme stored
  (changed at the owner's review in phase 6)
- [X] T010 menu enhancer island: `Escape`, outside click, close on navigation, focus
  return; Vitest for the server parts

## Phase 5 — Listing parts (FR-003, FR-012, FR-021, edge cases, R-6)
- [X] T011 product card (placeholder, name clamp with full name in `title`, brand,
  highlights, price, stock badge with text + icon, equal heights), card grid
- [X] T012 filters: facet groups (first 8 values + "Show all (N)"), ranges with
  "Apply", "in stock only"; desktop column; phone `<details>` panel with the applied
  count and the modal enhancer island (R-6, built in place, not as a `<dialog>`);
  applied-filter chips; result count in a polite live region
- [X] T013 [P] sort control (GET form, no JS needed), pagination (short stable set,
  none for one page), breadcrumbs, empty / error / not-found states (the loading state
  was built and removed in phase 6: pages are not streamed, ADR 0025)
- [X] T014 Vitest: links of chips and pagination keep the query (reuse `lib/query.ts`),
  counts, states

## Phase 6 — Pages (FR-010, FR-011, FR-014, US-1…US-3)
- [X] T015 home and category pages rebuilt (phone / tablet / desktop layouts)
- [X] T016 brand and search pages rebuilt
- [X] T017 product page rebuilt (above-the-fold block, description, specs table),
  still ISR (ADR 0025)
- [X] T018 not-found and error pages rebuilt; `components/storefront.tsx`, `app/legacy.css`
  and every TASK-6 class removed (`git grep` of the old class names returns nothing); TASK-6
  Vitest suites green unchanged in behaviour (markup assertions updated only)
- [ ] T019 **the stack is started with generated data and the pages are opened for the
  owner to see** at three widths, both themes

## Phase 7 — Visual, accessibility and budget tests (FR-040…FR-042, NFR-002, R-7, R-8)
- [X] T020 `@playwright/test`, `@axe-core/playwright` pinned; `playwright.config.ts`
  (phone / tablet / desktop + a no-JS project); edge-case products and an empty category
  through the admin API in `e2e/seed.mjs`, a step of the stack after datagen and before
  the shop starts
- [X] T021 `e2e/*.spec.ts`: every automatable case of `test-cases.md` — screenshot +
  axe; theme persistence; no-JS flows; JS budget per route; CLS; no third-party
  requests
- [X] T022 everything in Docker: `e2e/Dockerfile` (the repo built in
  `mcr.microsoft.com/playwright:v1.65.1-noble`), `e2e/compose.yaml` (Postgres in memory,
  datagen, seed, catalog-service, gateway, shop, a shop on a dead gateway, the tests; no
  port published), `e2e/compose.serve.yaml` (`--serve`); `scripts/visual.mjs` wrapper
  (`--update`, `--serve`); `test:visual` script; `.dockerignore`; baselines committed;
  `.gitignore` for reports
- [X] T023 `.github/workflows/web-visual.yml` (PRs touching `apps/web/**`,
  `shared/dto/**`, the workflow), report artifact on failure

## Phase 8 — Rules and docs (FR-031, FR-044, R-10)
- [ ] T024 ADR 0025: a paragraph on why pages are not streamed (no `loading.tsx`: the
  status would be sent before 404 / 308 is known); `docs/web-guidelines.md`; `AGENTS.md` Map row + rule line; README web
  section; `docs/technologies.md` rows (Tailwind CSS, Inter / Fontsource, Playwright,
  axe-core, Lighthouse; Next.js ISR row: on demand for product pages); reference check
  of every name cited

## Phase 9 — Manual cases and close (FR-043, US-4, US-5)
- [ ] T025 keyboard walk-through, screen-reader spot check, Lighthouse (3 runs each,
  medians), a slow connection (TC-32) → `test-cases.md` results
- [ ] T026 run all test cases (`test-cases.md` playbook), report, then `close-task.md`

## Dependencies
Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. `[P]` items inside a phase are independent.
