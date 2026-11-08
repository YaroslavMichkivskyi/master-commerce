# 0002. Monorepo with pnpm workspaces and Turborepo

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

Five NestJS services, a Next.js app, Lambdas, shared packages (contracts, outbox, observability), CDK and tools must evolve together; follow-up work branches from one tag (`mvp-v1`).

## Considered options

- One repository per service (polyrepo)
- Nx monorepo
- pnpm workspaces + Turborepo

## Decision

One monorepo with pnpm workspaces; Turborepo runs build / lint / test with caching and affected-only execution. Layout as in `docs/mvp-plan.md` §8.

## Consequences

- Atomic changes across services and contracts; one tag freezes the whole baseline.
- CI runs only affected packages, saving Actions minutes.
- Turborepo is lighter than Nx but has fewer generators; services are scaffolded by hand.
