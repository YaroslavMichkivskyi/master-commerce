---
id: TASK-36
title: >-
  Web: design system, storefront UI, performance and SEO rules, visual tests by
  test cases
status: Done
assignee:
  - '@YaroslavMichkivskyi'
created_date: '2026-11-21T09:47:00Z'
updated_date: '2026-11-28T10:48:00Z'
labels:
  - mvp
  - speckit-full
  - web
dependencies:
  - TASK-6
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: the shop looks and feels like a real hardware store, loads fast and stays visually correct as it grows. Built right after TASK-6, so the cart, checkout and admin (TASK-9, TASK-10, TASK-12) are made from the same components instead of being restyled later.

Scope:
- Design system: tokens (colour, type scale, spacing, radius, shadow, light / dark), a self-hosted font via next/font, the components the shop needs (header with search and category menu, footer, buttons, inputs, checkbox / range filters, product card, price and stock badges, breadcrumbs, sort, pagination, empty / error / loading states, image placeholders until TASK-16). The styling approach is chosen in the task (candidates: Tailwind CSS v4 + shadcn/ui on Radix, or CSS Modules with own tokens) and recorded in an ADR.
- The TASK-6 storefront pages (home, category, brand, search, product, 404) are redesigned with it: responsive for phone, tablet and desktop, filters in a drawer on phones, the current plain styles fixed and removed, so no design bugs are left behind.
- Accessibility: WCAG 2.2 AA (contrast, focus, keyboard, labels, landmarks); everything keeps working without JavaScript where TASK-6 made it so.
- Rendering strategy, recorded in an ADR and in docs/web-guidelines.md: static pages regenerated on demand (ISR) for the unfiltered home, category, brand and product pages; per-request server rendering for filtered lists and search; Next.js Cache Components / partial prerendering evaluated for a static shell with fresh price and stock; plain build-time SSG only for small fixed pages. Why this mix suits a large catalog (SSG of every product at build time does not scale; SSR of every page wastes the cache).
- General web rules in docs/web-guidelines.md, linked from AGENTS.md, binding for every later web task: performance budgets (Core Web Vitals at p75 on mobile: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1; first-load JS per route budget; server components by default, client components only for interaction; no layout shift from fonts or images), SEO rules (unique title / description, canonical, noindex on filtered states, structured data, semantic HTML, one h1, crawlable links), caching rules.
- Visual tests by test cases: a test-case table for the storefront UI (pages x states: normal, empty, error / unavailable, out of stock, long names, many facets, deep pagination) following docs/playbooks/test-cases.md; Playwright screenshot tests (toHaveScreenshot) of those cases on a small fixed datagen catalog at three widths, plus axe accessibility checks; run in CI on PRs that touch apps/web. Defects found later are filed as bug tasks. TASK-14 extends this to full e2e journeys and Lighthouse.
- docs/technologies.md for every new tool.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The design system (tokens, fonts, components) exists, the styling choice is recorded in an ADR, and every TASK-6 page uses it on phone, tablet and desktop with the old ad-hoc styles removed
- [x] #2 docs/web-guidelines.md states the rendering strategy (ADR), performance budgets and SEO rules; the storefront pages meet the budgets (measured, Lighthouse performance >= 90, SEO 100, accessibility >= 95 on the category and product pages)
- [ ] #3 The storefront test-case table exists; Playwright screenshot and axe tests cover its automatable cases at three widths and run in CI for web changes; the manual cases were run and reported
- [x] #4 WCAG 2.2 AA checks pass (axe, keyboard-only walk-through of filters, sort and pagination)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [x] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
speckit-full in specs/036-web-design/: spec, clarify, plan with styling ADR (Tailwind v4 + shadcn/ui vs CSS Modules) and rendering-strategy ADR, tasks, test-case table; then design tokens and font, components, page-by-page redesign of the TASK-6 storefront (responsive, filters drawer on phones), docs/web-guidelines.md linked from AGENTS.md, Playwright screenshot + axe tests at three widths in CI, Lighthouse measurements, keyboard walk-through, technologies.md rows. One reviewed commit per step.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Storefront redesigned on a design system: Tailwind CSS v4 with our own components (ADR 0024), tokens in one file with light and dark themes (device theme on the first visit, kept; light/dark switch), self-hosted Inter; every TASK-6 page rebuilt for phone, tablet and desktop, TASK-6 styles removed, everything works without JavaScript (islands only for the theme, menu, phone filter panel and sort). Rendering decided in ADR 0025: product pages ISR on demand (5 min), lists per request with the data cache, no streaming so statuses stay real, page and data caches in memory only. docs/web-guidelines.md holds the rules (rendering, caching, budgets, SEO, accessibility, components, tests), linked from AGENTS.md and README. Verified: 159 unit tests; 57 visual cases wholly in Docker (Playwright screenshots at 390/768/1280 px and dark, axe WCAG 2.0-2.2 AA zero violations, no-JS flows, JS 134 KB of 150 per route, CLS 0, own origin only); Lighthouse medians category 99/100/100, product 99/100/100; keyboard walk and slow-connection run; test-cases.md 30 pass, TC-21 (screen reader) accepted by the owner without a run, TC-30 (CI) runs on the PR. Three rounds of /code-review: real findings fixed with tests, false positives and declined ones recorded in the PR. Risks: prices and stock on product pages up to 5 minutes old until TASK-18 (cart and checkout re-check them, TASK-9/10); flood protection is TASK-25/34; isrFlushToDisk is an experimental Next flag to recheck on upgrades.
<!-- SECTION:FINAL_SUMMARY:END -->
