# 0003. NestJS microservices with a database per service

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The MVP must be a realistic modern e-commerce system with an event-driven part, and the catalog — the busiest data — needs a clearly bounded database of its own.

## Considered options

- A modular monolith with one database
- Microservices sharing one database
- NestJS microservices, each with its own PostgreSQL database

## Decision

Services `api-gateway`, `identity-service`, `catalog-service`, `order-service`, `cloud-bridge` on NestJS (TypeScript); every stateful service owns its database; cross-service data flows through APIs and events only.

## Consequences

- The catalog database is isolated; its load and evolution can be observed on their own.
- Distributed concerns appear (consistency, sagas, tracing) — intended, they are part of the learning goal.
- More moving parts locally; Docker Compose keeps them manageable.
