# Quickstart: validate the walking skeleton

## Prerequisites
- Node.js 24 LTS (22.12+ works), `corepack enable` once
- Docker Desktop (Windows / macOS) or Docker Engine + Compose v2 (Linux)
- Git

## Scenarios

1. **One-command start (AC #2).**
   ```
   pnpm install
   pnpm dev
   ```
   Expect: `.env` is created from `.env.example`, the 4 containers are reported
   `healthy`, and three dev servers log that they are listening on 3000 / 3001 / 3002.
   A warm start takes under 60 s (NFR-001).

2. **Thread end to end (AC #1).** Open http://localhost:3000 and expect the 6 seeded
   categories. `curl -s http://localhost:3000 | grep "Graphics cards"` matches: the
   HTML comes from the server.

3. **Data is not hard-coded.**
   ```
   docker compose exec postgres-catalog psql -U catalog -d catalog -c "insert into category(name, slug, sort_order) values ('Monitors','monitors',70)"
   ```
   Reload the page; "Monitors" is last.

4. **Swagger (FR-012).** http://localhost:3001/docs and http://localhost:3002/docs
   list the endpoints from `contracts/http.md`.

5. **Upstream down (edge case).** Stop catalog-service (Ctrl+C on its process, or
   `pnpm --filter catalog-service` not running). `curl -i localhost:3001/api/v1/categories`
   returns `503` with `application/problem+json`. The page shows "The catalog is
   unavailable right now".

6. **Restart is idempotent.** Restart `pnpm dev` and check that there are still 7
   categories, none duplicated.

7. **Tests.** `pnpm test` (unit + contract) and `pnpm test:integration` (needs Docker)
   pass. `pnpm lint` and `pnpm typecheck` are clean.

8. **CI (AC #3).** The PR `task-2 → dev` shows a green `ci` check.

9. **Stop / reset.** `pnpm stop` stops the containers and keeps the data. `pnpm reset`
   also deletes the volumes.

Run scenarios 1–7 on Windows. Run 1, 2 and 7 also on Linux (WSL or Docker), for the
cross-platform AC.
