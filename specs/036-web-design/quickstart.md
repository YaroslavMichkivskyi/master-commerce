# Quickstart: Web design

Docker is required for the visual tests (they always run in the Playwright image, so
screenshots match on every OS).

## See the storefront

```
pnpm dev
pnpm datagen --scale 1k --seed demo --reset
```

Open `http://localhost:3000`. Theme: the sun / moon / monitor switch in the header.

## Visual, accessibility and budget tests

```
pnpm --filter web test:visual            # build web, start the stack, run e2e in Docker
pnpm --filter web test:visual --update   # rewrite the reference screenshots
```

The report opens from `apps/web/playwright-report/index.html`.

## Lighthouse (manual, R-9)

With the visual-test stack running (production build on port 3000):

```
npx lighthouse@13.6.0 http://localhost:3000/c/graphics-cards --only-categories=performance,accessibility,seo --output=json --output-path=./lh-category.json
npx lighthouse@13.6.0 http://localhost:3000/p/<slug> --only-categories=performance,accessibility,seo --output=json --output-path=./lh-product.json
```

Three runs each; the medians go into `test-cases.md`.
