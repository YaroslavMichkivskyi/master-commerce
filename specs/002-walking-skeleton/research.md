# Research: Walking skeleton

Phase 0 of `plan.md`. One entry per decision: Decision / Rationale / Alternatives.
Versions were checked against the npm registry and Docker Hub on 2026-11-09.

## R-1. Runtime and package manager

- **Decision:** Node.js 24 LTS (`.nvmrc`; `engines.node >=22.12`, so 22 LTS machines
  still work). pnpm 10.15.0 is pinned in `packageManager` and activated with Corepack.
  Turborepo 2.11.10 runs the tasks.
- **Rationale:** ADR 0002. 24 is the active LTS. Vitest 5 needs Node ^22.12 or ≥24.
  `packageManager` and Corepack give every machine and CI the same pnpm without a
  global install.
- **Alternatives:** npm or Yarn workspaces (see R-10). Nx (rejected in ADR 0002).

## R-2. TypeScript version

- **Decision:** TypeScript **6.0.3**, strict.
- **Rationale:** TypeScript 7.0 (the native compiler) is out, but typescript-eslint
  8.72 supports only `<6.1.0`, and NestJS needs `experimentalDecorators` +
  `emitDecoratorMetadata`. 6.0 is the newest version the whole toolchain supports.
  Move to 7 in its own task once typescript-eslint supports it.
- **Alternatives:** 7.0.2 (breaks linting today). 5.9 (older for no reason).

## R-3. Backend framework

- **Decision:** NestJS 12.4 (`@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`,
  `@nestjs/swagger` 12.1, `@nestjs/terminus` for health). DTOs use `class-validator`
  0.15 + `class-transformer` 0.5.
- **Rationale:** ADR 0003, ADR 0014. Swagger decorators on the shared DTO classes give
  validation and OpenAPI from one place (ADR 0016).
- **Alternatives:** Fastify adapter — not needed yet; it can be switched later
  without changing the controllers.

## R-4. Gateway → service call

- **Decision:** The Node built-in `fetch` with `AbortSignal.timeout(2000)`, wrapped in
  one small `CatalogClient` provider in the gateway. Errors are mapped to RFC 9457
  `application/problem+json`. Unreachable or timed out → `503`; upstream 5xx → `502`.
- **Rationale:** One call does not justify `@nestjs/axios` or a proxy middleware. A
  typed client keeps the response contract checked at compile time (FR-010, FR-011).
- **Alternatives:** `http-proxy-middleware` (forwards blindly, no contract, no
  problem mapping). gRPC (not adopted, ADR 0016).

## R-5. Data access, migrations, seed

- **Decision:** Drizzle ORM 0.45.4 + `pg` 8.23.1. drizzle-kit 0.31.11 generates SQL
  migrations into `apps/catalog-service/drizzle/`. They are committed, and
  `drizzle-orm/node-postgres/migrator` applies them on service start. Seed:
  `INSERT … ON CONFLICT (slug) DO NOTHING`, run after the migrations (FR-002).
- **Rationale:** ADR 0005. Migrations stay as reviewable SQL, so the hot-path SQL of
  later tasks lives next to them.
- **Alternatives:** `drizzle-kit push` (no history, unsafe outside dev). A separate
  migration job (not needed yet).

## R-6. Web

- **Decision:** Next.js 16.4.5, App Router, React 19.3.1. The home page is a Server
  Component rendered per request (`dynamic = 'force-dynamic'`) and fetches
  `GATEWAY_URL/api/v1/categories`.
- **Rationale:** ADR 0008. ISR and revalidation come with TASK-6 and TASK-18. For now
  a dynamic render proves that the server-side HTML holds the data (AC #1).
- **Alternatives:** Static ISR now — revalidation has no trigger before TASK-18.

## R-7. Testing

- **Decision:** Vitest 5.1 everywhere. NestJS packages use `unplugin-swc` 2.0
  (+ `@swc/core` 1.16), so decorator metadata works under Vitest. HTTP tests use
  `supertest` 7.3. Integration tests use Testcontainers 12.2
  (`@testcontainers/postgresql`, image `postgres:17.11-alpine`). Test kinds:
  - **unit** — services and the client, with no I/O;
  - **integration** — catalog-service against a real Postgres: migrations → seed →
    `GET /categories`. Gateway against a stubbed catalog: forwarding and problem
    mapping;
  - **contract** — the gateway's and the service's responses validate against the
    shared `CategoryDto`, and every route is in the generated OpenAPI document.
- **Rationale:** One fast runner for TS and ESM. Testcontainers gives each test run its
  own database, the same on any OS and in CI (FR-051, constitution IV).
- **Alternatives:** Jest (the Nest default; slower, awkward with ESM). A shared
  Compose database for tests (state leaks between runs).

## R-8. Local stack (`pnpm dev`)

- **Decision:** `docker-compose.yml` runs only the infrastructure:
  - `postgres-identity`, `postgres-catalog`, `postgres-orders` — `postgres:17.11-alpine`,
    host ports 55432 / 55433 / 55434, `mem_limit` 256m each;
  - `rabbitmq` — `rabbitmq:4.3.7-management-alpine`, ports 5672 / 15672, `mem_limit`
    384m.

  Every service has a health check. Root scripts:
  - `pnpm dev` = `node tools/scripts/preflight.mjs && docker compose up -d --wait && turbo run dev`;
  - `pnpm stop` = `docker compose down`;
  - `pnpm reset` = `docker compose down -v`.

  `preflight.mjs` copies `.env.example` → `.env` if `.env` is missing, and stops with
  the name of any port taken by another process. App ports: web 3000, gateway 3001,
  catalog 3002. Every port is a variable in `.env`.
- **Rationale:** Clarification of 2026-11-09 (apps on the host). `up --wait` blocks
  until the health checks pass. Postgres host ports are 55432–55434, away from the
  5432–5434 range that native installs use. On Windows Docker can publish a port that a
  native service already listens on, and connections then reach the wrong server. That
  happened on the owner's machine with a native PostgreSQL on 5434, so the port check
  runs in `preflight.mjs` before Compose starts (edge case). The whole stack stays under 4 GB (NFR-002): 3 × 256m + 384m for the infrastructure, plus
  the Node processes. RabbitMQ 4.3 rather than 4.4: 4.4.0 is a fresh `.0` release.
- **Alternatives:** Apps in Compose with bind mounts (slow file watching on Windows
  and macOS). A Node orchestrator such as `concurrently` (Turborepo already runs
  persistent `dev` tasks).

## R-9. CI, dependency updates, `main`

- **Decision:** `.github/workflows/ci.yml` runs on `push` and `pull_request` to `dev`
  and `main`, on `ubuntu-24.04`:
  - `actions/checkout` (fetch-depth 0, for `--affected`), `pnpm/action-setup`,
    `actions/setup-node` with `cache: pnpm`;
  - `pnpm install --frozen-lockfile`;
  - `turbo run lint typecheck test test:integration --affected`.

  Docker is on the runner, so Testcontainers works there. A concurrency group cancels
  outdated runs. `.github/dependabot.yml`: ecosystem `npm` (it handles pnpm
  lockfiles) at `/`, and `github-actions`, weekly, minor + patch grouped. FR-053 goes
  to ADR 0012 and `release.md` as a rule.
- **Rationale:** mvp-plan §7. `--affected` saves Actions minutes on a private repo
  (NFR-003). Dependabot is free on private repos.
- **Alternatives:** Renovate (more setup, nothing gained yet). A separate
  `integration` workflow on PRs to `main` only (mvp-plan §7; it comes with TASK-13,
  and for now the integration tests run in `ci`).

## R-10. Why pnpm (owner's question)

- **Disk and speed.** pnpm keeps one content-addressed store per machine and
  hard-links packages into projects. A monorepo with 6+ apps downloads and stores
  every version once. Installs are usually 2–3× faster than npm.
- **Strict `node_modules`.** A package can import only what it declares. With npm or
  Yarn classic hoisting, `catalog-service` could silently use a dependency that only
  `web` declared, and break when deployed alone. pnpm fails at once.
- **Workspaces.** `workspace:*` links shared packages. `--filter` runs commands for
  one package and its dependents. Turborepo, Dependabot and GitHub's `setup-node`
  cache all support it natively.
- **Compared with Yarn Berry:** Plug'n'Play is just as strict, but it needs IDE and
  tool patches. pnpm keeps a normal `node_modules` that every tool understands.
- **Cost:** one more tool to install. Corepack removes that step.
