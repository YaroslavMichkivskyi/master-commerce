# 0019. Test tooling: Vitest everywhere, Testcontainers for integration tests

- Status: proposed
- Date: 2026-11-12
- Deciders: project owner

## Context and problem statement

TASK-2 (`specs/002-walking-skeleton/`) adds the first tests, and every later slice adds
unit, integration and API-contract tests (constitution IV). The repo is full ESM
(NestJS 12 ships ESM only), NestJS dependency injection needs decorator metadata, and
the integration tests need a real PostgreSQL that behaves the same on Windows, macOS,
Linux and in CI.

## Considered options

- Jest (the NestJS default) with ts-jest or `@swc/jest`
- Vitest
- Node's built-in test runner

For integration tests:

- the Compose databases of the local stack (ADR 0018)
- Testcontainers: a fresh container per test file

## Decision

**Vitest for every package; Testcontainers for integration tests.**

- Vitest 5.1 runs unit, integration and contract tests in every package. NestJS
  packages compile tests with `unplugin-swc` (+ `@swc/core`), which emits decorator
  metadata; esbuild, Vitest's default, does not.
- Test kinds, split by folder in each backend package:
  - unit — next to the code in `src/` (`*.test.ts`), `pnpm test`, no I/O;
  - integration — in `test/` (`*.int.test.ts`), `pnpm test:integration`, real
    dependencies;
  - contract checks live in the integration tests: responses validate against the
    shared DTO classes (`class-validator`), and every route is in the generated
    OpenAPI document (ADR 0014, ADR 0016).
- HTTP tests use `supertest` against the Nest app in-process.
- Integration tests start their own PostgreSQL with Testcontainers
  (`@testcontainers/postgresql`, the same `postgres:17.11-alpine` image as Compose).
  The service runs its real migrations and seed against it. Calls between services are
  tested against a local stub HTTP server.
- CI runs the same commands on `ubuntu-24.04`; Docker is on the runner.

Why not Jest: its ESM support is still experimental and needs flags and module
mapping; it is slower on TypeScript. Why not the Node runner: no module mocking,
watch UI or coverage integration on the level the project needs. Why not the Compose
databases: state leaks between runs and from manual testing, and tests would depend on
`pnpm dev` being up.

## Consequences

- One fast runner with native ESM and TypeScript; the same config shape everywhere.
- Each test run gets a clean database, so tests are repeatable and can run in
  parallel; failures can be reproduced on any OS.
- Docker must be running for `pnpm test:integration`; the first run pulls the image.
- Container start adds a few seconds per integration test file; keep one container per
  file.
- Browser end-to-end tests are a separate decision (Playwright, TASK-14; Cypress is
  compared in TASK-26).
