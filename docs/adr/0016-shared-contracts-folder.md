# 0016. Shared contracts in a top-level `shared/` folder

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The gateway, the services and `web` exchange the same DTOs over HTTP, and services
exchange events over RabbitMQ. Copying these types per app lets them drift silently;
mixing them with runtime libraries (outbox, observability) in `packages/` hides which
code is a contract and which is behaviour. gRPC between services may be adopted later
and would need `.proto` files shared the same way.

## Considered options

- Each app defines its own copies of the types
- One `packages/contracts` package next to the runtime libraries
- A top-level `shared/` folder with one workspace package per kind of contract

## Decision

A top-level `shared/` folder holds contracts only, one pnpm workspace package per kind:

- `shared/dto` — HTTP request / response DTOs (with `class-validator` and
  `@nestjs/swagger` decorators, so validation and OpenAPI come from one place, ADR 0014)
  and shared interfaces / enums;
- `shared/events` — versioned event envelopes and payloads (replaces the planned
  `packages/contracts`);
- `shared/proto` — Protocol Buffers for gRPC, reserved: gRPC is **not** adopted yet; using
  it for service-to-service calls needs its own ADR, then `.proto` files and code
  generated from them live here.

`packages/` keeps runtime libraries (outbox, observability). Rules for what may go into
`shared/` are in `shared/README.md`.

## Consequences

- One definition per contract; a change shows up in every consumer at compile time.
- Contract changes need versioning discipline (optional fields, event `version`).
- `web` must import types only or use an OpenAPI-generated client, so Nest decorators do
  not reach the browser bundle.
