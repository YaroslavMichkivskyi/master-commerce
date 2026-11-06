# MVP plan: a computer hardware online shop

Version 2 — 2026-11-08. What the MVP contains and the principles it is built by.
The order of work — `roadmap.md`; the tasks — `backlog/`.

## 1. Product

A shop of computers and components (B2C): CPUs, graphics cards, SSDs, laptops,
peripherals. A customer searches and filters products, adds them to the cart, places
an order (payment is a stub) and receives an e-mail. An administrator manages the
catalog, prices, stock and orders.

Product and category pages are rendered on the server (Next.js) so that search engines
index them.

## 2. Engineering principles

1. **A real shop, not a demo.** Built the way a product team would build it: no
   speculative features and no "extension points" for things that are not planned.
2. **The catalog database is the heart of the system** (products, brands, categories,
   specs, prices, stock) and carries real load: storefront reads, price and stock
   edits from the admin panel, stock reservation on orders.
3. **Local first.** Everything runs locally in Docker Compose with resource limits.
   Cloud parts (Lambda, S3, SES) handle asynchronous side work only, never a user
   request, and are switched off by a flag locally.
4. **Observability from day one:** `/metrics` (Prometheus) in every service,
   structured logs, health checks.
5. **Tests ship with every change:** unit, integration and contract tests form the
   regression suite from the start.
6. **A deterministic data generator** (seed, skew: many products from a few brands)
   for demos and load tests.
7. **A frozen baseline:** when the MVP is complete, `main` gets the `mvp-v1` tag;
   follow-up work branches from it.
8. **Explicit data access.** A thin type-safe layer (Drizzle ORM), no lazy-loading
   "magic"; hot-path queries may be hand-written SQL.

## 3. Architecture

```
                     ┌──────────────┐
  browser ──────────►│  web (Next)  │  SSR / ISR of product pages, SEO
                     └──────┬───────┘
                            │ REST
                     ┌──────▼───────┐
                     │ api-gateway  │  NestJS: routing, JWT check, rate limit
                     └─┬─────┬────┬─┘
             ┌─────────┘     │    └──────────┐
      ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
      │  identity   │ │   catalog   │ │    order    │   NestJS
      │  Postgres   │ │  Postgres   │ │  Postgres   │   (a database each)
      └─────────────┘ └──────┬──────┘ └──────┬──────┘
                             │  outbox        │  outbox
                          ┌──▼────────────────▼──┐
                          │       RabbitMQ       │  events
                          └──┬───────────────┬───┘
                             │               │ (cloud only)
                     subscriber services  ┌──▼──────────┐
                                          │ cloud-bridge │ → SQS → AWS Lambda
                                          └──────────────┘
```

| Service | Responsible for | Storage |
|---|---|---|
| `web` | storefront, cart, checkout, customer account, admin panel | — (Next.js, App Router) |
| `api-gateway` | single entry point, JWT, rate limit, response aggregation | — |
| `identity-service` | sign-up, sign-in, JWT / refresh, roles (customer, admin), addresses | PostgreSQL `identity` |
| `catalog-service` | brands, categories, products, specs (JSONB), prices, stock, full-text search (PostgreSQL FTS), stock reservation | PostgreSQL `catalog` |
| `order-service` | cart, checkout, orders and their statuses, payment stub | PostgreSQL `orders` |
| `cloud-bridge` | forwards selected RabbitMQ events to AWS SQS; off locally | — |

Search is PostgreSQL FTS, without Elasticsearch: one storage technology per service
(ADR 0009).

## 4. Events

The broker is RabbitMQ (NestJS built-in transport). Publishing goes through a
Transactional Outbox in the publisher's database; every event has an `id` and a
`version`; subscribers are idempotent.

| Event | Publisher | Subscribers | Why |
|---|---|---|---|
| `order.placed` | order | catalog | reserve stock |
| `stock.reserved` / `stock.rejected` | catalog | order | confirm / cancel the order (choreography saga) |
| `order.confirmed`, `order.shipped` | order | Lambda `notify` | e-mail the customer |
| `product.changed` (price, stock, publication) | catalog | Lambda `revalidate` | refresh the product page in Next (on-demand ISR) |
| `product.image_uploaded` | catalog | Lambda `thumbnails` | thumbnails in S3 |
| `user.registered` | identity | Lambda `notify` | welcome e-mail |

## 5. AWS Lambda

Only asynchronous work, never in the path of a user request:

| Function | Trigger | What it does |
|---|---|---|
| `notify` | SQS (order, sign-up events) | e-mails via Amazon SES |
| `thumbnails` | S3 upload | product image thumbnails |
| `revalidate` | SQS (`product.changed`) | calls the Next revalidate endpoint |
| `sitemap` | EventBridge Scheduler (daily) | `sitemap.xml` in S3 for search engines |

Infrastructure as code — AWS CDK (TypeScript). Lambdas are not needed locally: e-mails
go to a local mail catcher, thumbnails come from a stub.

## 6. Deployment

| Part | Where | Why |
|---|---|---|
| `web` | AWS Amplify Hosting (fallback — Vercel) | Next.js SSR, domain, SEO |
| services + Postgres + RabbitMQ | one small VM (EC2 / Lightsail) with Docker Compose | cheap; ECS / RDS are too expensive for a study project |
| Lambda, S3, SQS, SES, EventBridge | AWS, via CDK | serverless, within the free tier at low load |

Turn on AWS Budgets with an alert from day one. The cloud deployment is a showcase and
experience; load tests run locally.

## 7. GitHub Actions

| Workflow | When | What it gives |
|---|---|---|
| `ci` | push / PR to `dev` and `main` | lint, typecheck, unit tests of affected packages only (Turborepo), pnpm cache |
| `integration` | PR to `main` | service integration tests with service containers (Postgres, RabbitMQ) |
| `images` | merge to `main`, tags | Docker image build, push to GHCR, Trivy scan |
| `deploy-lambdas` | changes in `infra/` / `lambdas/` on `main` | `cdk deploy` via OIDC — no long-lived AWS keys |
| `deploy-app` | tag `v*` | update images on the VM over SSH; Amplify deploys itself via its webhook |
| `lighthouse` | PRs touching `web` | Lighthouse CI: SEO / page performance |
| `release` | merge to `main` | release-please: versions, changelog, tags |
| `load-test` | manual (`workflow_dispatch`) | a k6 run on a **self-hosted runner**; results as an artifact |
| `nightly-smoke` | schedule | a short k6 run that catches performance regressions |

Plus: Dependabot, protection of `main` (only via PRs from `dev`, green CI), reusable
workflows and composite actions for shared steps.

Actions minutes for a private repo are limited — heavy runs go to the self-hosted
runner, GitHub-hosted runners do CI only.

## 8. Repository

```
master-commerce/
  apps/
    web/                  — Next.js
    api-gateway/          — NestJS
    identity-service/  catalog-service/  order-service/  cloud-bridge/
  lambdas/
    notify/  thumbnails/  revalidate/  sitemap/
  packages/
    contracts/            — event types and DTOs shared by services
    outbox/               — shared outbox + publishing implementation
    observability/        — metrics, logs, health
  infra/                  — AWS CDK
  tools/datagen/          — data generator
  docker-compose.yml
  .github/workflows/
  docs/                   — mvp-plan.md, roadmap.md, technologies.md, adr/, playbooks/
```

pnpm workspaces + Turborepo.

## 9. MVP stages

The big picture; the detailed order is `roadmap.md`.

| Stage | What | Done when |
|---|---|---|
| M1 | monorepo, Docker Compose (Postgres × 3, RabbitMQ), `ci` workflow, branch protection | `pnpm dev` starts everything, CI is green |
| M2 | `catalog-service`: brands, categories, products, specs, prices, stock, FTS; data generator | a 100K-product catalog, search and filters work |
| M3 | `identity-service` + `api-gateway`: sign-up, sign-in, roles | a JWT passes through the gateway |
| M4 | `order-service`: cart, checkout, outbox, stock-reservation saga | an order is confirmed / cancelled through events |
| M5 | `web`: catalog, product page (SSR / ISR), search, cart, checkout, account, a simple admin panel | the customer journey works in the browser |
| M6 | observability (Prometheus, Grafana), regression and contract tests, `integration` workflow | dashboards exist, tests run in CI |
| M7 | AWS: CDK, Lambda, `cloud-bridge`, deployment, `deploy-*` and `lighthouse` workflows | the shop is live on a domain, pages are in the sitemap |
| M8 | freeze: merge to `main`, tag `mvp-v1` | the MVP baseline is fixed |
