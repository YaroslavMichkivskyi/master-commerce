---
id: TASK-36
title: >-
  Web: design system, storefront UI, performance and SEO rules, visual tests by
  test cases
status: To Do
assignee: []
created_date: '2026-11-21T09:47:00Z'
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
- [ ] #1 The design system (tokens, fonts, components) exists, the styling choice is recorded in an ADR, and every TASK-6 page uses it on phone, tablet and desktop with the old ad-hoc styles removed
- [ ] #2 docs/web-guidelines.md states the rendering strategy (ADR), performance budgets and SEO rules; the storefront pages meet the budgets (measured, Lighthouse performance >= 90, SEO 100, accessibility >= 95 on the category and product pages)
- [ ] #3 The storefront test-case table exists; Playwright screenshot and axe tests cover its automatable cases at three widths and run in CI for web changes; the manual cases were run and reported
- [ ] #4 WCAG 2.2 AA checks pass (axe, keyboard-only walk-through of filters, sort and pagination)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
