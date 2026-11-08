# 0009. Search on PostgreSQL FTS, no Elasticsearch

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The storefront needs product search. An extra search store means another system to run, synchronise and monitor.

## Considered options

- Elasticsearch / OpenSearch
- Meilisearch
- PostgreSQL full-text search

## Decision

PostgreSQL FTS (`tsvector`, GIN index) inside the catalog database.

## Consequences

- One storage technology per service; no search-index synchronisation.
- Search quality is adequate for an MVP; no typo tolerance.
