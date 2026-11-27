---
id: TASK-39
title: Search misses hyphenated names written as one word (tplink → TP-Link)
status: To Do
assignee: []
created_date: '2026-11-27T23:15:00Z'
labels:
  - no-spec
  - backend
dependencies: []
priority: medium
type: bug
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Broken: the storefront search finds nothing for 'tplink' although TP-Link products exist; 'tp-link' and 'tp link' find them. Cause (checked): catalog-service builds the query with to_tsquery('english', …) over products.search; PostgreSQL's parser splits 'TP-Link' into the tokens 'tp-link', 'tp' and 'link', so the single word 'tplink' matches none of them. The same holds for any hyphenated or spaced name typed as one word (G.Skill → gskill, be quiet! → bequiet). Touches: catalog-service (search document of a product, its migration and backfill; storefront/search-query.ts), integration tests. Options to weigh in the fix: add the joined form of hyphenated / multi-word names to the search document, or a pg_trgm fallback that also forgives typos. Relation: TASK-35 (search engine) may later replace this; the fix must not wait for it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Searching 'tplink', 'tp-link' and 'tp link' finds the same TP-Link products; the same for 'gskill' / 'G.Skill'
- [ ] #2 Existing search behaviour stays (prefix of the last word, ranking, the TASK-6 search tests green); the search p95 on the local 90k catalog does not get worse by more than 10 %
- [ ] #3 An integration test covers names written joined, hyphenated and spaced
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria checked with evidence (tests, run output, screenshots)
- [ ] #2 Tests added / updated and green locally and in CI
- [ ] #3 Docs updated (ADR, docs/technologies.md, README / runbook) where needed
- [ ] #4 PR from task-<N> / bug-<N> to dev opened (docs/playbooks/close-task.md)
<!-- DOD:END -->
