---
id: TASK-35
title: >-
  Search engine: evaluate Elasticsearch, OpenSearch and their alternatives,
  adopt one for the storefront
status: To Do
assignee: []
created_date: '2026-11-21T00:21:00Z'
labels:
  - post-mvp
  - speckit-full
  - backend
  - data
dependencies:
  - TASK-20
  - TASK-8
priority: medium
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: storefront search with what PostgreSQL FTS (ADR 0009, TASK-6) does not give — typo tolerance, synonyms, suggestions while typing, better relevance and faceting at scale — if a dedicated engine earns its cost.

Scope:
- Compare on the shop's own data (the data generator, 100 000 and 1 000 000 products): Elasticsearch, OpenSearch, Meilisearch, Typesense, Manticore Search, and the PostgreSQL-native options (ParadeDB pg_search / BM25, pg_trgm for typos) as the baseline. Criteria: relevance on a fixed query set, typo tolerance, facets and filters, latency P95 under load, indexing time, memory / disk, operations in Docker Compose and on the VM, licence (SSPL / AGPL / Apache-2.0), client maturity for Node.
- Adopt the winner (or decide to stay on PostgreSQL with extensions) in a new ADR that supersedes or amends ADR 0009.
- If an engine is adopted: a search index fed by catalog events (outbox, TASK-8) with a full rebuild from the catalog database; the storefront search and its facets served from it behind a switch, PostgreSQL FTS kept as the fallback; the index lag observable (TASK-13).
- The storefront API contract (TASK-6 contracts/http.md) stays the same, so web needs no change.
- Docs: docs/technologies.md, README, ADR.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A comparison of at least four engines plus the PostgreSQL baseline on the generated catalog, with the numbers, is recorded in the spec and the ADR
- [ ] #2 The chosen option serves storefront search with typo tolerance, under the same API contract, P95 not worse than PostgreSQL FTS at 1 000 000 products
- [ ] #3 The index follows catalog changes through events and can be rebuilt from scratch; its lag is visible
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
