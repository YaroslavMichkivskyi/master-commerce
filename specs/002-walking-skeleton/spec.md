# Feature Specification: Walking skeleton

**Feature Branch**: `task-2`
**Spec folder**: `specs/002-walking-skeleton/`
**Task**: TASK-2 — `backlog/tasks/task-2 - Walking-skeleton-monorepo-one-end-to-end-page-Compose-CI.md`
**Mode**: speckit-light
**Status**: Draft
**Created**: 2026-11-09
**Input**: "Walking skeleton: monorepo, one end-to-end page, Compose, CI"

---

## Scope

The first runnable version of the shop: one thin thread through every layer, with no
real features yet. A browser page lists the product categories that are stored in the
catalog database. The list travels database → `catalog-service` → `api-gateway` →
`web`, and the page is rendered on the server. The skeleton also brings the monorepo
layout, the local stack started by one command, and CI on pull requests. Every later
task plugs into this skeleton instead of setting up its own. Touches: `web`,
`api-gateway`, `catalog-service`, `shared/dto`, the local stack, CI.

---

## Goal

A developer clones the repo, runs one command and sees a shop page in the browser that
shows data read from the catalog database through the gateway. A pull request to `dev`
is checked automatically. Later slices then only add behaviour; nobody needs to touch
the plumbing again.

**Acceptance**
- Given a fresh clone with the prerequisites installed (Node.js, pnpm, Docker), when
  the developer runs the single start command, then the databases, the broker, the
  three apps and the web page all come up on Windows, macOS and Linux. *(TASK-2 AC #2)*
- Given the stack is running, when the developer opens the home page, then it lists
  the categories stored in the catalog database. The list arrives from the gateway,
  and the HTML the server returns already contains it. *(TASK-2 AC #1)*
- Given a pull request to `dev`, when it is opened or updated, then CI runs lint, type
  checks and tests for the affected packages and reports a status. The skeleton's own
  PR shows a green status. *(TASK-2 AC #3)*
- Given a category row added to the database, when the page is reloaded, then the new
  category appears. Nothing on the page is hard-coded.

### Edge Cases
- The catalog database is empty → the page renders an empty-state message, not an error.
- `catalog-service` is down → the gateway answers with a problem response
  (`503`, RFC 9457 body), and the page renders an "unavailable" message. The page
  never shows a blank screen or a stack trace.
- A port the stack needs is already taken → the start command fails with a message
  naming the port, and every port can be changed in one local config file.

---

## Functional Requirements

### Catalog service
- **FR-001** `catalog-service` MUST own its own database, with one table of product
  categories (identifier, name, URL slug, display order).
- **FR-002** The schema MUST be created by versioned migrations that run on start. A
  small set of seed categories MUST be inserted idempotently, so restarts never
  duplicate them.
- **FR-003** `catalog-service` MUST expose one read endpoint that returns all
  categories in display order.
- **FR-004** `catalog-service` MUST expose a health endpoint that reports whether its
  database is reachable.

### Gateway
- **FR-010** `api-gateway` MUST expose the category list under the public API prefix
  and forward the call to `catalog-service`. It MUST NOT reach any database itself.
- **FR-011** When the upstream fails or times out, the gateway MUST answer with an
  RFC 9457 problem response, not the raw upstream error.
- **FR-012** Every HTTP endpoint of both services MUST be described in OpenAPI and
  browsable in Swagger UI at `/docs` of that service (ADR 0014).

### Shared contracts
- **FR-020** The category response DTO MUST be defined once in the shared DTO package
  (ADR 0016) and used by the gateway, the service and the web app. The web app MUST
  import it as a type only.

### Web
- **FR-030** The home page MUST render the category list on the server, from the
  gateway only, and handle the empty and unavailable cases (see Edge Cases).

### Developer experience
- **FR-040** The repo MUST be one workspace with shared TypeScript, lint and format
  settings for every package.
- **FR-041** One command MUST start the whole local stack: three PostgreSQL
  databases (identity, catalog, orders), RabbitMQ, the three apps with hot reload, and
  the web app. A second command MUST stop it. A third MUST reset all local data.
- **FR-042** Ports and credentials MUST come from a local env file created from a
  committed example file. The repo MUST NOT contain real secrets.
- **FR-043** Lint, type check and test commands MUST be runnable from the repo root
  for all packages, and for affected packages only.

### CI and repository
- **FR-050** A CI workflow MUST run on pushes and pull requests to `dev` and `main`.
  It MUST run lint, type check and unit tests of the affected packages, and cache
  dependencies.
- **FR-051** An integration test MUST prove the thread end to end against a real
  catalog database: seed → service → gateway → response.
- **FR-052** Automated dependency-update PRs MUST be configured for the workspace
  packages and the GitHub Actions used.
- **FR-053** `main` MUST accept changes only through pull requests with a green CI
  status, where the GitHub plan allows it (see Assumptions).

### Non-functional
- **NFR-001** A warm start of the stack (images and dependencies already present)
  MUST be ready in under 60 s on a typical laptop.
- **NFR-002** Every container MUST have memory limits, so that the whole stack fits in
  4 GB of RAM.
- **NFR-003** The CI run for a docs-only change MUST take under 3 minutes.
- **NFR-004** Every dependency and container image MUST have a pinned version.

### Key Entities
- **Category** — a top-level group of products in the shop (e.g. "CPUs", "Graphics
  cards"). It has a human name, a unique URL slug and a display order. TASK-4 extends
  it into the full category tree.

---

## Out of Scope
- Products, brands, specs, prices, stock, search — TASK-4, TASK-6.
- Service chassis: structured logging, metrics, correlation ids, a shared error
  module — TASK-3. The skeleton has only what FR-004 and FR-011 need.
- Authentication and the identity / order services' code — TASK-7, TASK-10. Their
  databases are only started.
- Events, outbox, RabbitMQ topology — TASK-8. The broker is only started.
- Docker images for deployment, deploys, release automation — TASK-19.
- Security and quality scanners beyond dependency-update PRs — TASK-22.
- Page design. The page is plain and unstyled.

## Explicitly Not Restated Here
- Constitution principles I–VII (`.specify/memory/constitution.md`).
- ADR 0002 (pnpm + Turborepo), 0003 (NestJS, database per service), 0004
  (PostgreSQL 17), 0005 (Drizzle + SQL), 0008 (Next.js App Router), 0012 (git
  workflow), 0014 (Swagger), 0016 (`shared/`).
- `docs/mvp-plan.md` §3 (architecture), §7 (`ci` workflow), §8 (repository layout).

## Assumptions
- Apps run on the host with hot reload. Only the infrastructure (Postgres, RabbitMQ)
  runs in containers. This is the fastest dev loop on every OS. Containerised apps
  come with TASK-19.
- Branch protection on a **private** repo needs a paid GitHub plan. If the account's
  plan does not allow it, FR-053 is recorded as a manual rule in the docs and is not
  enforced by GitHub. The owner decides on plan or visibility.
- Seed categories are a short fixed list (around 6). The large generated dataset comes
  with TASK-5.

## Clarifications
<!-- none: speckit-light -->

---

## Review & Acceptance Checklist
- [x] No implementation details (languages, frameworks, APIs) in requirements — only the ADR-fixed stack is named
- [x] Every requirement is testable and unambiguous; IDs are stable
- [x] Goal has Given / then acceptance; edge cases listed
- [x] Scope is bounded; Out of Scope names the owning task where relevant
- [x] Matches the backlog task's acceptance criteria (AC #1–#3 mapped above)
- [x] No speculative features or extension points (mvp-plan.md §2)
- [x] Every new / changed endpoint is listed — category list (service, gateway), health; all in Swagger (FR-012)
- [x] No `[NEEDS CLARIFICATION]` markers remain
