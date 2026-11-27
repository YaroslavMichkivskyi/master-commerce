# 0024. Styling: Tailwind CSS v4 with our own components and design tokens

- Status: accepted
- Date: 2026-11-27
- Deciders: project owner

## Context and problem statement

TASK-36 (`specs/036-web-design/`, FR-001…FR-004, FR-006) gives the web app a design system:
tokens for colour, type, spacing, radius, shadow and breakpoints, a light and a dark
theme, and components for every part the storefront uses. The storefront pages are server
components and must work without JavaScript (TASK-6 FR-013): filters, the phone filter
panel and the mega-menu included. The first-load JavaScript of a route is budgeted at
150 KB compressed (NFR-002). The admin panel (TASK-12) will reuse the same tokens.

## Considered options

- **Tailwind CSS v4 with our own components** — utilities generated at build, no run-time
  JavaScript; tokens are CSS custom properties declared in `@theme`, so a utility and a
  hand-written rule read the same variable, and the dark theme only changes their values.
- **Tailwind CSS v4 with shadcn/ui (Radix)** — polished accessible parts fast, but its
  menu, drawer, select and dialog are client components that need JavaScript; each would
  need a second, no-JS version for the storefront.
- **CSS Modules with our own tokens** — no dependency, but the most hand-written CSS and
  no shared vocabulary of spacing and sizes.

## Decision

Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`, pinned) with our own React
components: primitives in `apps/web/components/ui/`, shop parts in
`apps/web/components/shop/`. No component library.

- **Tokens only.** Raw colours, sizes and breakpoints are written only in
  `apps/web/app/theme.css`. Tailwind's default palette and fonts are switched off
  (`--color-*: initial`, `--font-*: initial`), so only our tokens exist as utilities.
  Arbitrary values in class names (`w-[37px]`, `bg-[#123]`, `[mask:none]`) are refused by
  an ESLint `no-restricted-syntax` rule in `apps/web/eslint.config.mjs`; the attribute
  variants `data-[…]:` and `aria-[…]:` stay allowed.
- **Themes.** Every colour token is `light-dark(<light>, <dark>)`; the theme follows
  `color-scheme`: the device setting, unless `data-theme` on `<html>` fixes it.
  `apps/web/app/theme.test.ts` checks WCAG contrast of every text pair (4.5:1) and
  interface pair (3:1) in both themes.
- **Font.** Inter variable, self-hosted from `@fontsource-variable/inter` through
  `next/font/local` (`apps/web/app/fonts.ts`): no font service at build or run time.
- `globals.css` holds only the imports and the base layer. Class names are joined with
  `components/ui/cx.ts`; no `clsx` / `tailwind-merge`.

## Consequences

- No run-time cost for styling; pages stay server components, the budget goes to the two
  client islands (theme switch, menu and filter-panel enhancer).
- A new colour or size is a token in `theme.css` and passes the contrast test, or the
  tests of the change fail.
- `light-dark()` needs browsers from 2024 on (the supported "last two versions" all have
  it); without it the colours would not apply.
- shadcn/ui may still be considered for admin dialogs in TASK-12, where JavaScript is
  required anyway; it would be built on these tokens.
