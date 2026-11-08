# 0005. Drizzle ORM, hand-written SQL for hot-path queries

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

MVP code should be productive and type-safe, but on hot paths an ORM hides the SQL that actually runs (generated queries, lazy loading, hydration cost).

## Considered options

- TypeORM / Prisma everywhere
- Raw SQL everywhere
- Drizzle + raw SQL for hot-path queries

## Decision

Drizzle ORM (schema, migrations, queries) in every service. Performance-critical queries (hot paths under load tests) may be hand-written SQL via `pg`.

## Consequences

- Thin, predictable SQL from Drizzle; migrations as code.
- Hot-path queries are explicit and easy to profile.
- Two data-access styles in one codebase — the boundary is documented here.
