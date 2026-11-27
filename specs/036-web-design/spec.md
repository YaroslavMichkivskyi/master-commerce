# Feature Specification: Web design

**Feature Branch**: `task-36`
**Spec folder**: `specs/036-web-design/`
**Task**: TASK-36 — `backlog/tasks/task-36 - Web-design-system-storefront-UI-performance-and-SEO-rules-visual-tests-by-test-cases.md`
**Mode**: speckit-full
**Status**: Approved (2026-11-27)
**Created**: 2026-11-27
**Input**: "Web: design system, storefront UI, performance and SEO rules, visual tests by test cases"

---

## Scope

The storefront built in TASK-6 works but looks like a plain HTML page. This feature
gives the web app a design system — a fixed set of visual tokens, a font and the
components a hardware shop needs — and rebuilds every TASK-6 page with it, so the shop
looks and feels like a real hardware store on a phone, a tablet and a desktop, is
accessible, and stays fast. It also writes down the rules every later web task follows
(how pages are rendered and cached, performance budgets, SEO rules) and adds visual and
accessibility tests driven by a test-case table, so the look does not silently break as
the cart, checkout and admin (TASK-9, TASK-10, TASK-12) are built from the same parts.
Touches: web only. No API, service or data change.

---

## User Scenarios

### US-1 — Shop on a phone
A customer on a phone opens a category, opens the filters, ticks a brand, sorts by
price and pages through the results, then opens a product.

**Acceptance**
- Given a phone-width screen, when a category page is opened, then the products are
  shown as cards in a single or double column, nothing overflows the screen sideways,
  and the filters are behind one "Filters" control that opens them over the list.
- Given the filters are open on a phone, when a filter is applied, then the list shows
  the filtered result with the applied filters visible and removable above it.
- Given a phone, when the header is used, then search and the category menu are
  reachable from it without horizontal scrolling.
- Given JavaScript is off, then the filters, sort, pagination, search and category
  menu still work on every width (as they did in TASK-6).

### US-2 — Shop on a desktop
**Acceptance**
- Given a desktop-width screen, when a category page is opened, then the filters are a
  column next to a grid of product cards, with the total, the sort and the pagination
  visible without opening anything.
- Given a product page on a desktop, then name, price, stock status and the key facts
  are visible above the fold; the description and the full specs table follow.
- Given a tablet-width screen, then the layout is the phone or the desktop one,
  whichever fits, never a broken mix. *(TASK-36 AC #1)*

### US-3 — A consistent, recognisable shop
**Acceptance**
- Given any storefront page, then it uses the same header (logo, search, category
  menu), footer, colours, type, spacing and components as every other page; no page
  keeps the TASK-6 ad-hoc styles. *(TASK-36 AC #1)*
- Given the device is set to a dark appearance, then the shop shows its dark theme
  with the same contrast rules as the light one.
- Given the visitor picks a theme with the header switch, when they come back later,
  then the shop opens in that theme without first flashing the other one.
- Given the header, when "Catalog" is opened, then a two-level menu of the top
  categories and their subcategories appears.
- Given a product has no image yet (TASK-16), then its card and page show a neutral
  placeholder of the final image size, so adding images later moves nothing.
- Given a page is empty or failing (catalog unavailable, nothing found, product not
  found), then it shows a designed state with a way on (back to the category, the
  categories list, retry), not bare text.
- Given a slow connection, when the customer follows a link, then the current page stays
  until the next one arrives whole, and nothing on it shifts (pages are not streamed, so
  their HTTP status stays true — ADR 0025).

### US-4 — Use the shop with a keyboard or a screen reader
**Acceptance**
- Given only a keyboard, when a customer walks through the header, filters, sort,
  pagination and product cards, then every control is reachable in a logical order,
  the focus is always visible, and the phone filter panel can be opened and closed
  and traps no focus once closed. *(TASK-36 AC #4)*
- Given a screen reader, then every page has landmarks (header, navigation, main,
  footer), one main heading, labelled form controls and announced filter / result
  counts. *(TASK-36 AC #4)*

### US-5 — The shop stays fast and indexable
**Acceptance**
- Given the category and product pages of a production build, when measured with a
  mobile profile, then Lighthouse scores performance ≥ 90, SEO 100 and accessibility
  ≥ 95. *(TASK-36 AC #2)*
- Given any storefront page, then nothing visible shifts once it has loaded (fonts,
  placeholders, filters). *(TASK-36 AC #2)*
- Given the TASK-6 SEO behaviour (titles, descriptions, canonical, noindex on filtered
  states, structured data, robots, sitemap), then it is unchanged by the redesign.

### US-6 — A developer changes the web app safely
**Acceptance**
- Given a web change, when its PR runs CI, then screenshot tests of the storefront
  test cases at three widths and accessibility checks run and fail on an unexpected
  visual difference or an accessibility violation. *(TASK-36 AC #3)*
- Given a developer starts a later web task, then one document tells them how pages are
  rendered and cached, the performance budgets and the SEO rules they must keep, and
  the components to build from. *(TASK-36 AC #2)*

### Edge Cases
- A very long product, brand or category name → it wraps or is shortened with the full
  name still available; cards in a row keep the same height.
- A category with many facets or a facet with many values → the filter column stays
  usable: long value lists are collapsed with "show all".
- Deep pagination (page 100 of 100) and a single page → pagination shows a short,
  stable set of page links; no pagination for a single page.
- A product out of stock → its card and page show it clearly and differently from one
  in stock, without relying on colour alone.
- Very wide screens → content keeps a maximum width; very narrow (320 px) → still no
  sideways scroll.
- Prices with many digits (`€12,999.99`) → fit the card at every width.

---

## Functional Requirements

### Design system
- **FR-001** The web app MUST define its visual tokens in one place: colours (light and
  dark, each with text / background pairs meeting WCAG 2.2 AA contrast), a type scale,
  spacing, radii, shadows and breakpoints for phone, tablet and desktop. Pages and
  components use only the tokens, never raw values.
- **FR-002** The web app MUST use a self-hosted font (no request to a third-party font
  host at run time) that loads without a visible layout shift.
- **FR-003** The web app MUST have the components the storefront needs, each with its
  states (default, hover, focus, disabled, error where relevant): header with logo,
  search and category menu; footer; button; text and number inputs; checkbox; range
  (from / to) filter; filter panel (column on desktop, overlay on phone) with applied
  filters; product card; price; stock badge; breadcrumbs; sort control; pagination;
  empty, error and not-found states; image placeholder. *(A loading state was dropped at
  the owner's review of phase 6, 2026-11-28: a page is never streamed, ADR 0025.)*
- **FR-004** The choice of styling approach MUST be recorded in an ADR with the options
  weighed. *(TASK-36 AC #1)*
- **FR-005** The shop MUST have a light and a dark theme. On the first visit the theme
  is the device's setting and is remembered; a two-position switch in the header (light /
  dark) changes it, the choice is remembered for later visits, and a page never flashes
  the other theme while loading. Without JavaScript the device setting applies.
- **FR-006** The look MUST be calm and airy in layout and type (moderate density,
  plenty of white space, readable text), with vivid, saturated accent colours — a
  bright, slightly neon accent and a second contrasting one, gradients allowed on
  accents — instead of plain greys, in both themes and within FR-001 contrast.
- **FR-007** The header category menu MUST be a two-level menu: one "Catalog" control
  opens a panel with the top categories and their subcategories, each a link; it works
  with a keyboard and without JavaScript, and on a phone it opens full-screen.

### Storefront pages
- **FR-010** Home, category, brand, search, product, not-found and error pages MUST be
  rebuilt from the design system and laid out for phone, tablet and desktop, keeping
  every TASK-6 behaviour (addresses, filters, facets, counts, sort, pagination,
  redirects, SEO) unchanged. *(TASK-36 AC #1)*
- **FR-011** The TASK-6 ad-hoc styles MUST be removed; no page or component is left
  styled outside the design system. *(TASK-36 AC #1)*
- **FR-012** On a phone the filters MUST open as an overlay from one control and show
  the number of applied filters on it; the applied filters MUST be shown as removable
  chips above the list on every width.
- **FR-013** Everything that worked without JavaScript in TASK-6 MUST keep working
  without it: filters, sort, pagination, search, the category menu and the phone filter
  panel.
- **FR-014** The product page MUST show name, brand, price with VAT, stock status and up
  to the first five specs above the fold on desktop, then the description and the full
  specs table.

### Accessibility
- **FR-020** Every storefront page MUST meet WCAG 2.2 AA: contrast, visible focus,
  keyboard operation, labelled controls, landmarks, one `h1`, focus targets of at
  least 24 × 24 px, no information by colour alone. *(TASK-36 AC #4)*
- **FR-021** Filter result changes and the result count MUST be announced to assistive
  technology.

### Rendering, performance and SEO rules
- **FR-030** The rendering strategy MUST be decided and recorded in an ADR: which pages
  are pre-rendered and regenerated on demand or by time (unfiltered home, category,
  brand and product pages), which are rendered per request (filtered lists, search),
  whether a static shell with fresh price and stock is used, and which small fixed
  pages are built once; with why this mix suits a large catalog. The storefront MUST
  then be served that way. *(TASK-36 AC #2)*
- **FR-031** A web guidelines document MUST state, as binding for every later web task,
  the rendering strategy (FR-030), the performance budgets (NFR-001, NFR-002), the rule
  "server-rendered by default, interactive parts only where needed", the caching rules,
  the SEO rules (unique title and description, canonical, noindex on filtered states,
  structured data, semantic HTML, one `h1`, crawlable links) and the accessibility rules
  (FR-020); `AGENTS.md` MUST link to it. *(TASK-36 AC #2)*

### Tests
- **FR-040** A storefront UI test-case table MUST list pages × states — normal, empty,
  error / unavailable, out of stock, long names, many facets, deep pagination, phone
  filters open — each marked automated or manual (`docs/playbooks/test-cases.md`).
  *(TASK-36 AC #3)*
- **FR-041** Every automatable case MUST have a screenshot test at phone, tablet and
  desktop width, against a small fixed catalog generated from a fixed seed, and an
  automated accessibility check with no violations. *(TASK-36 AC #3, AC #4)*
- **FR-042** These tests MUST run in CI on every PR that changes the web app, and the
  reference screenshots MUST be reproducible on any developer OS (generated in the
  same environment CI uses). *(TASK-36 AC #3)*
- **FR-043** The manual cases (keyboard walk-through, screen-reader spot check,
  Lighthouse runs) MUST be run and their results recorded in the table.
  *(TASK-36 AC #3, AC #4)*
- **FR-044** Every new tool MUST have its row in `docs/technologies.md`.

### Non-functional
- **NFR-001** Core Web Vitals targets of the storefront pages at the 75th percentile on
  mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; in lab, Lighthouse mobile performance
  ≥ 90, SEO 100, accessibility ≥ 95 on the category and product pages. *(TASK-36 AC #2)*
- **NFR-002** First-load JavaScript per storefront route MUST stay within a budget fixed
  in the web guidelines and checked on every build.
- **NFR-003** The TASK-6 server-side targets (NFR-001, NFR-002 of `specs/006-storefront-browse/`)
  still hold — the redesign adds no catalog calls per page.

---

## Out of Scope
- Product images and their sizes in the media store — TASK-16; this task only reserves
  their space with placeholders.
- Cart, checkout, account and admin screens — TASK-9, TASK-10, TASK-7, TASK-12; they
  will be built from these components.
- Full end-to-end user journeys, contract tests and Lighthouse in CI — TASK-14.
- Component tests in Cypress — TASK-26.
- On-demand revalidation on a catalog change — TASK-18 (the rendering ADR names where
  it plugs in, nothing more).
- Other languages and currencies, a component catalogue site (Storybook) — not in the
  MVP.
- Faster lists of very large categories — TASK-37.

## Explicitly Not Restated Here
- Storefront behaviour, addresses, filters, SEO metadata — `specs/006-storefront-browse/`.
- Server rendering and ISR for SEO — ADR 0008; error pages without stack traces — TASK-2.
- Test-case table format — `docs/playbooks/test-cases.md`.
- Engineering principles — `docs/mvp-plan.md` §2.

## Assumptions
- Breakpoints: phone < 640 px, tablet 640–1023 px, desktop ≥ 1024 px; screenshot widths
  390, 768 and 1280 px.
- The shop keeps the name "master-commerce" and gets a simple text-based logo; no
  external brand assets.
- Lighthouse is run in lab on a local production build with its default mobile profile;
  field Core Web Vitals come only after deployment (TASK-19).
- The screenshot catalog is a small datagen catalog (a few hundred products) from a
  fixed seed, so screenshots do not change between runs.

## Clarifications

### Session 2026-11-27
- Q: What overall look? → A: light and dark themes; moderate density and calm type as
  in a clean shop, but colours brighter than plain greys — a slightly neon accent or
  otherwise varied, not uniform (FR-006).
- Q: Light / dark theme? → A: both; follow the device by default, plus a header switch
  remembered per visitor (FR-005).
- Q (owner's review of phase 6, 2026-11-28): A "device" position on the switch? → A: no;
  two positions, light / dark; the device theme of the first visit is stored (FR-005).
- Q: Header category menu? → A: a two-level mega-menu — top categories with their
  subcategories (FR-007).

---

## Review & Acceptance Checklist
- [x] No implementation details (languages, frameworks, APIs) in requirements
- [x] Every requirement is testable and unambiguous; IDs are stable
- [x] Every US has Given / then acceptance; edge cases listed
- [x] Scope is bounded; Out of Scope names the owning task where relevant
- [x] Matches the backlog task's acceptance criteria
- [x] No speculative features or extension points (mvp-plan.md §2)
- [x] Every new / changed endpoint is listed — none: web only
- [x] No `[NEEDS CLARIFICATION]` markers remain
