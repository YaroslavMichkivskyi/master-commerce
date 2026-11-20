# Tasks: Data generator

**Input**: [spec.md](spec.md), [plan.md](plan.md)
**Tests**: required (constitution IV); each step ships with its tests.
Each phase is one or more reviewed commits (`start-task.md` step 6).

## Phase 1 — Package and building blocks (FR-001, FR-007, D-1, D-2, D-5)
- [x] T001 `tools/datagen` package: `package.json` (pinned deps), `tsconfig`, Vitest
  config, lint; builds in turbo with the rest
- [x] T002 `src/random.ts`: `splitmix32`, `sfc32`, sub-streams by key, integer / float /
  pick / weighted pick / chance, Zipf CDF with binary search; unit tests: a pinned
  sequence, equal for equal keys, independent sub-streams, Zipf shape
- [x] T003 [P] `src/ids.ts` (UUIDv7 from a time and random bits) and `src/csv.ts` (one
  row → one CSV line: quoting, numbers, dates, JSON, PostgreSQL arrays); unit tests

## Phase 2 — The catalog description (FR-003…FR-006, D-3, D-6)
- [x] T004 `src/catalog/`: the tree (about 20 leaves, the seeded six slugs included),
  attributes of all five types (some on inner categories), about 50 brands with their
  leaves and lines, per leaf: weight, price base, spec ranges and naming; unit tests:
  counts, types used, seeded slugs, every value a leaf can draw allowed by its
  attribute
- [x] T005 `src/generate.ts`: rows of brand, category, category_attribute and product
  in order, as iterables; products per leaf by weight, brand by Zipf, specs, price,
  stock, publication, slug / SKU / id / times (D-3…D-5); unit tests: counts for 1,
  1 000 and an odd scale; unique slugs and SKUs; ids increasing; Zipf slope; shares of
  out-of-stock and published; determinism and a pinned hash

## Phase 3 — Output and loading (FR-010…FR-015, D-7, D-8)
- [ ] T006 `src/load.ts` + `src/cli.ts` + root script `pnpm datagen`: arguments, `.env`, schema check, refusal /
  `--reset`, `COPY` of each table in one transaction, `ANALYZE`; `--out` CSV files,
  `--no-load`; the summary (parameters, counts, hash, time, peak memory); unit tests of
  the CSV output and the summary
- [ ] T007 `apps/catalog-service/test/datagen.int.test.ts`: load 2 000 products into a
  migrated database as the owner; every product valid by `validateSpecs` against its
  effective attributes; refusal with products present, `--reset` replaces, a
  categories-only catalog replaced; a load failing half way leaves the tables as
  before; the service as `catalog_app` lists, filters, reads by slug and patches a
  generated product; `db:migrate` afterwards seeds nothing again

## Phase 4 — Docs and verification
- [ ] T008 [P] README (filling the catalog), `docs/technologies.md` (generator,
  `pg-copy-streams`), `quickstart.md`
- [ ] T009 full checks (`format:check`, `turbo run lint typecheck test test:integration
  build --force`), fresh clone, the pinned hash on Windows and in CI, NFR-001 (100 000
  timed) and NFR-002 (1 000 000, peak memory) on the local stack; notes in TASK-5
