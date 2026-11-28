# Implementation Plan: Web design

**Branch**: `task-36` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/036-web-design/spec.md`

## Summary

The web app gets a design system on Tailwind CSS v4: tokens as CSS variables (light
and dark, bright violet-blue and neon cyan / lime accents on calm surfaces), Inter
self-hosted, and our own server components for every part the storefront uses. The
TASK-6 pages are rebuilt from them for phone, tablet and desktop; the mega-menu and
the phone filter panel work on native `<details>` without JavaScript and are upgraded
by two small client islands. Rendering (ADR 0025, after a measured spike that rejected
Cache Components): product pages by ISR on demand, lists, search and home per request
with the 5-minute data cache of unfiltered answers. `docs/web-guidelines.md` makes the rendering,
budget, SEO and accessibility rules binding. Playwright screenshot, axe, JS-budget and
CLS tests of a storefront test-case table run at three widths in the official
Playwright image, locally and in a new CI workflow. Decisions: [research.md](research.md);
how to run: [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict) on Node.js 24 LTS — as before

**Primary Dependencies** (new, web only, pinned): `tailwindcss` 4.3.5,
`@tailwindcss/postcss` 4.3.5, `@fontsource-variable/inter` 5.3.0; dev:
`@playwright/test` 1.65.1, `@axe-core/playwright` 4.14.1; image
`mcr.microsoft.com/playwright:v1.65.1-noble`; Lighthouse 13.6.0 run with `npx` (not a
dependency). Next.js stays 16.4.5, React 19.3.1.

**Storage**: none

**Testing**: Vitest as before (server components with the stubbed gateway, ADR 0019) +
a token-contrast unit test; Playwright + axe in Docker against the real local stack

**Target Platform**: browsers: last two versions of Chrome, Edge, Firefox, Safari,
iOS Safari, Chrome Android; hosts Windows / macOS / Linux; CI `ubuntu-24.04`

**Project Type**: monorepo; `apps/web` changed, docs, one new CI workflow

**Performance Goals**: NFR-001 (CWV p75 mobile, Lighthouse ≥ 90 / 100 / ≥ 95),
NFR-002 (≤ 150 KB compressed first-load JS per route), NFR-003 (no new catalog calls)

**Constraints**: no-JS parity with TASK-6 (FR-013); no API change; tokens only

**Scale/Scope**: ~20 components, 7 pages, 2 client islands, ~25 visual cases × 3 widths

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Ordinary shop, no speculative features | pass | the usual parts of a hardware shop; no Storybook, no icon or theme libraries (R-11) |
| II. Spec is the source of truth | pass | every FR / NFR / US mapped below; no spec change |
| III. Local first, explicit data access | pass | no data access change; tests run on the local Compose stack; product pages by ISR ask the catalog less often |
| IV. Tests ship with the change | pass | Vitest pages stay green; contrast unit test; Playwright visual / axe / budget / CLS cases (R-7, R-8) |
| V. Observable and documented | pass | no endpoint change; `docs/web-guidelines.md`, ADRs, README |
| VI. No scope creep, decisions recorded | pass | ADR 0024 (styling), ADR 0025 (rendering, amends ADR 0008) |
| VII. Git workflow and approval | pass | branch `task-36`, reviewed steps |
| Gate: versions pinned, cross-platform | pass | exact versions; screenshots in one image on every OS; Node scripts only |
| Gate: new technology documented | pass | `docs/technologies.md`: Tailwind CSS, Inter / Fontsource, Playwright, axe-core, Lighthouse; Next.js ISR row updated (on demand for product pages) |

## Requirement mapping

| Requirement | Design | Verified by |
|---|---|---|
| FR-001, FR-006 | `app/theme.css` tokens, both themes (R-1, R-2) | unit: every text / UI pair ≥ 4.5:1 / 3:1 in both themes; lint: no arbitrary values |
| FR-002 | Inter via `next/font/local` (R-4) | visual: no third-party font request (Playwright request log); CLS check |
| FR-003 | `components/ui/*`, `components/shop/*` | visual cases per component state on real pages |
| FR-004 | ADR 0024 | review |
| FR-005 | `data-theme` + inline head script + switch island (R-3) | Playwright: chosen theme survives reload with no frame of the other; no-JS uses `prefers-color-scheme` |
| FR-007 | `<details>` mega-menu + enhancer (R-6) | visual: menu open at three widths; keyboard case; no-JS case |
| FR-010, FR-011 | pages rebuilt; `globals.css` rewritten, old classes removed | Vitest page tests unchanged and green; `git grep` of every TASK-6 class name returns nothing |
| FR-012 | filter `<details>` → `<dialog>` island, chips (R-6) | visual: phone filters open; keyboard: focus kept and returned |
| FR-013 | server components, links and GET forms | Playwright project with `javaScriptEnabled: false`: filter, sort, page, search, menu, phone filters |
| FR-014 | product page layout | visual desktop: name, price, stock, 5 specs above 800 px |
| FR-020, FR-021 | landmarks, one `h1`, labels, focus ring token, 24 px targets, live region (R-6) | axe zero violations; manual keyboard walk-through; screen-reader spot check |
| FR-030 | product ISR, lists per request (R-5 outcome); ADR 0025 | `app/rendering.test.ts`; build route table (`●` product); spike numbers in ADR |
| FR-031 | `docs/web-guidelines.md`, link in `AGENTS.md` (R-10) | review; reference check |
| FR-040 | `specs/036-web-design/test-cases.md` | review |
| FR-041 | `apps/web/e2e/*.spec.ts`, 3 projects (R-8) | the run itself |
| FR-042 | `.github/workflows/web-visual.yml`, Docker image everywhere (R-8) | a PR run; the same baselines pass on Windows and in CI |
| FR-043 | manual rows of the table (R-9) | recorded results |
| FR-044 | `docs/technologies.md` rows | review |
| NFR-001 | budgets in guidelines (R-7), Lighthouse (R-9) | Lighthouse medians; CWV field data after TASK-19 |
| NFR-002 | JS budget test (R-7) | Playwright per route |
| NFR-003 | no new catalog calls | Vitest: number of gateway calls per page |
| US-1…US-6 | as above | test cases referencing each US |

## Project Structure

```
apps/web/
  app/theme.css                 # tokens: @theme + light / dark values (R-1, R-2)
  app/globals.css               # @import tailwind + theme, base layer only
  app/fonts.ts                  # Inter via next/font/local (R-4)
  app/layout.tsx                # shell: theme script, header, footer
  app/{page,c,brands,p,search,not-found,error}  # rebuilt pages (rendering: ADR 0025)
  app/rendering.test.ts         # pins the rendering of each page (ADR 0025)
  components/ui/                # button, input, select, checkbox, range, badge, price, icon, placeholder, cx
  components/shop/              # header, mega-menu, footer, product-card, filters, chips,
                                # sort, pagination, breadcrumbs, states, theme-switch
  components/storefront.tsx     # removed (split into the above)
  postcss.config.mjs
  e2e/                          # Playwright: cases, setup, budget, cls, axe
  playwright.config.ts
  scripts/visual.mjs            # runs e2e in the Playwright image on any OS (R-8)
.github/workflows/web-visual.yml
docs/web-guidelines.md
docs/adr/0024-styling-tailwind-own-components.md
docs/adr/0025-rendering-strategy.md
specs/036-web-design/{research,quickstart,tasks,test-cases}.md
```

## Implementation order (one reviewed commit each)

1. Rendering spike (Cache Components on category + product) → numbers; ADR 0025
   (done: Cache Components rejected, product ISR taken).
2. Tailwind, tokens, font, contrast test; ADR 0024.
3. `ui/` primitives and icons.
4. Shell: header + mega-menu + theme switch + footer.
5. Listing parts: card, filters + phone panel, chips, sort, pagination, breadcrumbs, states.
6. Pages rebuilt one by one (rendering as ADR 0025); old styles and `storefront.tsx` removed.
7. Playwright + axe + budget + CLS, `visual.mjs`, baselines; CI workflow.
8. `docs/web-guidelines.md`, `AGENTS.md` link, README, `docs/technologies.md`, ADR index, roadmap.
9. Manual cases: keyboard, screen reader, Lighthouse → `test-cases.md`.

## Docs touched in this task

- ADR 0024 (new), ADR 0025 (new, amends 0008 — 0008 gets an "Amended by" line),
  `docs/adr/README.md`, `docs/roadmap.md` ADR list.
- `docs/web-guidelines.md` (new), `AGENTS.md` Map + rule, README web section,
  `docs/technologies.md`.

## Decided with the owner

- Look: calm density and type, bright slightly-neon accents, both themes (spec
  clarifications). Theme: device on the first visit, kept; light / dark switch. Two-level mega-menu.
- Styling: Tailwind v4 with our own components, no shadcn/ui for now. Font: Inter.
