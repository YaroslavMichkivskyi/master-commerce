# shared — contracts used by more than one app

Everything two or more apps (services, gateway, `web`, Lambdas) must agree on is defined
here once and imported, never copied. Code that *does* something (outbox, logging,
metrics) lives in `packages/`; `shared/` holds **contracts only** — types, schemas and
their validation metadata (ADR 0016).

Each subfolder is a pnpm workspace package, created by TASK-2 / the task that first needs it.

| Folder | Package | What goes here |
|---|---|---|
| `dto/` | `@master-commerce/dto` | request / response DTO classes of the HTTP APIs (with `class-validator` and `@nestjs/swagger` decorators, so validation and Swagger come from one place), shared enums and TypeScript interfaces (`interfaces/`) |
| `events/` | `@master-commerce/events` | event envelope (`id`, `type`, `version`, `occurredAt`) and versioned payload types of every RabbitMQ / SQS event (`order.placed`, `product.changed`, …), routing keys |
| `proto/` | `@master-commerce/proto` | Protocol Buffers (`.proto`) for gRPC and the TypeScript generated from them — **only if gRPC is adopted** (a separate ADR); empty until then |

## Rules

- A contract used by a single app stays in that app; it moves here when a second app
  needs it.
- No business logic, no I/O, no framework modules — only types, classes with
  decorators, constants and schemas.
- `web` imports types only (`import type …`) or uses a client generated from OpenAPI,
  so server-side decorators never reach the browser bundle.
- Changing a published event or DTO is a breaking change: add a new event `version` /
  a new DTO field as optional, keep the old one until every consumer moved.
- Every change here is covered by the contract tests of the apps that use it.
