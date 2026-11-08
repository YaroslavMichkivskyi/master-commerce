# 0007. Choreography for the stock-reservation saga

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

Placing an order must reserve stock in `catalog-service` and confirm or cancel the order in `order-service` without a distributed transaction.

## Considered options

- Two-phase commit
- Orchestration by a saga coordinator
- Choreography via events

## Decision

Choreography: `order.placed` → catalog reserves → `stock.reserved` / `stock.rejected` → order confirms / cancels; compensation on cancellation and payment timeout; reservations expire.

## Consequences

- No coordinator service for a two-step flow.
- The flow is spread across services — documented in the feature spec and covered by integration tests.
- Revisit (new ADR) if the flow grows beyond three steps.
