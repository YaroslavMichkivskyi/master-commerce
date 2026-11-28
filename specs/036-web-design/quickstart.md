# Quickstart: Web design

Docker is required for the visual tests (their browser always runs in the Playwright
image, so screenshots match on every OS).

## See the storefront

```
pnpm dev
pnpm datagen --scale 1k --seed demo --reset
```

Open `http://localhost:3000`. Theme: the sun / moon switch in the header (the first
visit takes the device's theme and keeps it).

## Visual, accessibility and budget tests

```
pnpm --filter web test:visual            # build the image, start the stack, run the cases
pnpm --filter web test:visual --update   # rewrite the reference screenshots
pnpm --filter web test:visual --serve    # only the stack, shop on 127.0.0.1:3300, Ctrl+C
```

Everything runs in Docker (`apps/web/e2e/compose.yaml`): its own Postgres in memory, the
services, the shop and the tests; nothing is published on the host, so a running
`pnpm dev` and its catalog stay as they are. Without Node, from `apps/web/e2e`:
`docker compose run --rm --build tests`, then `docker compose down -v`. The report opens
from `apps/web/e2e/.report/index.html`; logs of a service: `docker compose logs <name>`
while the stack is up.

## Lighthouse (manual, R-9)

With the test stack served (`--serve`, production build on port 3300):

```
npx lighthouse@13.6.0 http://localhost:3300/c/graphics-cards --only-categories=performance,accessibility,seo --output=json --output-path=./lh-category.json
npx lighthouse@13.6.0 http://localhost:3300/p/visual-big-price --only-categories=performance,accessibility,seo --output=json --output-path=./lh-product.json
```

Three runs each; the medians go into `test-cases.md`.
