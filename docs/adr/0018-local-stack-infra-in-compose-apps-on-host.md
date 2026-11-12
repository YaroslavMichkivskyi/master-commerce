# 0018. Local stack: infrastructure in Docker Compose, apps on the host

- Status: proposed
- Date: 2026-11-12
- Deciders: project owner

## Context and problem statement

TASK-2 (walking skeleton, `specs/002-walking-skeleton/`) needs one command that starts
the whole shop on Windows, macOS and Linux. The shop has three PostgreSQL databases
(identity, catalog, orders; ADR 0003, ADR 0004), RabbitMQ (ADR 0006) and Node apps
(services, gateway, web) that are edited all day. "Local first" (`docs/mvp-plan.md` §2,
constitution III) asks that everything runs on the developer's machine with no cloud
and with resource limits. It does not say how the apps are run while they are being
developed.

On Windows, Docker can publish a port that a native service already listens on;
connections then reach the native server. This happened with a native PostgreSQL on
port 5434.

## Considered options

- Everything in Compose, apps in containers with the source bind-mounted
- Infrastructure in Compose, apps on the host started by Turborepo
- Infrastructure installed natively on each machine

## Decision

**Infrastructure in Compose, apps on the host** (owner's clarification, 2026-11-09).

- `docker-compose.yml` runs only the infrastructure, images pinned to exact tags:
  `postgres-identity`, `postgres-catalog`, `postgres-orders` (`postgres:17.11-alpine`,
  `mem_limit` 256m each) and `rabbitmq` (`rabbitmq:4.3.7-management-alpine`, 384m).
  Every service has a health check; data lives in named volumes.
- The apps run on the host with hot reload: `turbo run dev` starts every persistent
  `dev` task after `^build` of the shared packages.
- Root scripts: `pnpm dev` = port preflight → `docker compose up -d --wait` →
  `turbo run dev`; `pnpm stop` = `docker compose down`; `pnpm reset` =
  `docker compose down -v` (wipes the data).
- Every port and URL is a variable in `.env` (from `.env.example`). PostgreSQL host
  ports are 55432–55434, away from the 5432–5434 range of native installs.
- `tools/scripts/preflight.mjs` (plain Node, any OS) creates `.env` if it is missing
  and stops with the name of every port another process already uses.

Why not apps in containers: file watching through bind mounts is slow on Windows and
macOS, and every dependency change needs an image rebuild. Why not native
infrastructure: versions and settings would differ per machine.

## Consequences

- One command, the same pinned infrastructure on every OS; the apps keep fast hot
  reload and normal debugging.
- Node 24 and pnpm (via Corepack) are needed on the host, besides Docker.
- The infrastructure stays under its limits (3 × 256m + 384m); with the Node processes
  the stack fits in 4 GB.
- "Local first" holds: nothing runs in the cloud. Container images of the apps, and a
  Compose file that runs the apps too, come with TASK-19 (delivery), for the VM deploy
  (ADR 0011). Revisit this ADR then: a dev profile may run the apps in containers as
  well.
- Integration tests do not use this stack; they start their own containers (ADR 0019).
