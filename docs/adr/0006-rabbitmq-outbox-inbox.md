# 0006. RabbitMQ with Transactional Outbox / Inbox

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

Services exchange domain events (orders, stock, product changes). Losing or duplicating an event breaks the saga; other consumers (notifications, page revalidation) subscribe to the same stream.

## Considered options

- Kafka
- NATS JetStream
- Direct publish without outbox
- RabbitMQ + outbox / inbox

## Decision

RabbitMQ 4 as the broker. Publishers write events to an `outbox` table in the same transaction as the change; a relay publishes them. Consumers record processed event ids in an `inbox` table (idempotency); retries with backoff and a dead-letter queue. Shared code in `packages/outbox`, event types in `packages/contracts`.

## Consequences

- At-least-once delivery with idempotent consumers; no dual-write gap.
- RabbitMQ is light to run locally and has a NestJS transport.
- Relay polling adds delivery latency — it is monitored.
