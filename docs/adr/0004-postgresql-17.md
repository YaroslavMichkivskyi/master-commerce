# 0004. PostgreSQL 17 as the main DBMS

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The services need a relational database with JSONB, full-text search, `SKIP LOCKED` and good tooling.

## Considered options

- MS SQL Server
- MySQL 8
- PostgreSQL 17

## Decision

PostgreSQL 17 for every service database; the SQL layer is kept inside repositories.

## Consequences

- JSONB (product specs), FTS (search), outbox with `FOR UPDATE SKIP LOCKED`.
- Free, runs everywhere in Docker; exporters for Prometheus exist.
