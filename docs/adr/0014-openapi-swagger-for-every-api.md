# 0014. OpenAPI with Swagger UI for every HTTP API

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

Several services expose HTTP APIs (gateway, identity, catalog, order, later more).
Without a machine-readable contract the web app, contract tests and agents guess the
shape of requests and errors, and documentation drifts from the code.

## Considered options

- Hand-written API docs in Markdown
- OpenAPI written by hand (design-first YAML)
- OpenAPI generated from code (`@nestjs/swagger` decorators / DTOs) + Swagger UI

## Decision

Every HTTP API — every endpoint of every service, including the gateway and admin
routes — is described in OpenAPI 3 generated from code with `@nestjs/swagger`, and served
with Swagger UI:

- `GET /docs` — Swagger UI, `GET /docs/openapi.json` — the document (non-production
  profiles; in production behind the admin role or disabled by a flag);
- every endpoint has a summary, request / response DTO schemas, status codes including
  the RFC 9457 Problem Details errors, and auth requirements;
- the gateway publishes the aggregated document of the routes it exposes;
- the OpenAPI documents are the input of the contract tests (TASK-14) and may generate
  the typed client of `web`.

A task that adds or changes an endpoint is not done until its OpenAPI description and
Swagger UI are updated (`docs/playbooks/close-task.md`).

## Consequences

- One always-current contract per service; manual testing through Swagger UI.
- Decorators add boilerplate to controllers and DTOs.
- Wired once in the service chassis (TASK-3), so each service gets it by importing the
  base module.
