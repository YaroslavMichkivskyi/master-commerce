# Implementation Plan: Data generator

**Branch**: `task-5` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-datagen/spec.md`

## Summary

A new workspace package `tools/datagen` with a command-line entry
(`pnpm datagen --scale 100k --seed 42 [--reset] [--out <dir>] [--no-load]`). A seeded
pseudo-random generator drives a fixed description of the hardware catalog (category
tree, attributes, brands with their product lines, naming, price and spec rules) and
produces the rows of `category`, `category_attribute`, `brand` and `product` one at a
time, in a fixed order and text form. Each row goes, as CSV, into a SHA-256 hash, into
a `COPY … FROM STDIN` stream to the catalog database (one transaction, as the owner)
and, on request, into a CSV file. Products are never held in memory as a whole, so the
memory does not grow with the scale. The catalog's own validation checks the generated
products in the tests.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict, ESM) on Node.js 24 LTS — as the apps

**Primary Dependencies**: `pg` 8.23.1 (as catalog-service); new: `pg-copy-streams`
7.0.0 (`COPY FROM STDIN` streams for `pg`) and `@types/pg-copy-streams` 1.2.5. Argument
parsing with `node:util` `parseArgs`, hashing with `node:crypto`, the root `.env` read
with `process.loadEnvFile` — no further packages. The pseudo-random generator and the
Zipf sampling are a few dozen lines of our own (D-2), not a dependency.

**Storage**: the catalog database of TASK-4, its schema unchanged

**Testing**: Vitest 5.1 in the package (determinism, distributions, uniqueness, row
rules); in catalog-service an integration test (Testcontainers, the real migrations)
that loads a generated catalog and checks it with the catalog's validation and admin
API (ADR 0019)

**Target Platform**: Windows / macOS / Linux hosts, `ubuntu-24.04` CI — the hash of a
pinned case is asserted in the tests, so CI on Linux checks the same value as Windows

**Project Type**: monorepo; new package `tools/datagen`; catalog-service gets a test
and a dev dependency on it

**Performance Goals**: 100 000 products generated and loaded < 2 min (NFR-001); memory
< 512 MB at 1 000 000 (NFR-002)

**Constraints**: deterministic across machines (FR-001); no change to the catalog's
schema or code; loads as the owner, never as `catalog_app` (FR-010)

**Scale/Scope**: about 20 leaf categories, about 50 brands, 1 to 1 000 000 products

## Constitution Check

| Principle | Status | Evidence |
|---|---|---|
| I. Ordinary shop, no speculative features | pass | catalog data only; customers and orders are added by their tasks |
| II. Spec is the source of truth | pass | every FR mapped below; no spec change |
| III. Local first, explicit data access | pass | bulk `COPY` with hand-written column lists (ADR 0005); local stack only |
| IV. Tests ship with the change | pass | unit tests of the generator, an integration test against the real catalog |
| V. Observable and documented | pass | a summary line per run (FR-015); README, technologies |
| VI. No scope creep, decisions recorded | pass | decisions below are local to the tool; no ADR |
| VII. Git workflow and approval | pass | branch `task-5`, reviewed steps |
| Gate: versions pinned, cross-platform | pass | `pg-copy-streams` 7.0.0 pinned; no shell, paths via `node:path` |

## Design decisions

- **D-1. Fixed order and text, hash over it.** Tables are produced in the order brand,
  category, category_attribute, product, each row by its index. A row becomes one CSV
  line (RFC 4180 quoting, `\n` line ends); numbers are written by `String(n)`, dates as
  ISO-8601 UTC with milliseconds, JSON with keys in attribute order, arrays as
  PostgreSQL array literals. The hash is SHA-256 over the table names and lines in that
  order — the same bytes go to `COPY … (FORMAT csv)` and to the CSV files, so loading
  and writing give one hash. No `toLocaleString`, `localeCompare`, `Intl` or `Date.now`
  anywhere in the package.
- **D-2. Our own seeded generator.** `sfc32` seeded through `splitmix32` from the seed
  string: small, fast, well studied, and it gives the same sequence on every JavaScript
  engine because it is 32-bit integer arithmetic only. A dependency would bring nothing
  more and could change its sequence on an update. Each table and each product gets
  its own sub-stream (`seed:product:<i>`), so adding a column to one table later does
  not shift every other value.
- **D-3. Products per category, then per brand.** Leaves have weights (graphics cards
  and SSDs many, mice and cases fewer); the product count of each leaf is
  `round(N × weight)` with the remainder given to the heaviest leaves, so the sum is N.
  Within a leaf a brand is drawn by Zipf over its brands' ranks (exponent `--zipf`,
  default 1.1) from a precomputed CDF with binary search.
- **D-4. Unique slugs and SKUs by construction.** The product's index in base 36 ends
  its slug and SKU (`asus-rog-strix-rtx-4070-12gb-2bq`, `ASU-GPU-2BQ`), so no set of
  taken values is kept in memory, and the uniqueness holds at any scale.
- **D-5. Identifiers.** UUIDv7 built from the generated creation time (a fixed window,
  2025-01-01 to 2026-06-30, increasing with the row index) and generated random bits;
  creation and update time are that time, version 1. Ordering by id is then ordering
  by creation, as for rows the service writes.
- **D-6. Specs and prices from one product model.** A leaf describes its lines (e.g.
  "ROG Strix", "TUF Gaming") and the value range of each attribute; a product draws its
  key specs first, then its price grows from the leaf's base with them (more memory,
  higher clock → higher price, plus noise), rounded to 99 cents. Optional attributes
  are left out with a set probability. Values are drawn only from what the attribute
  allows, and a unit test checks every leaf's model against its attributes.
- **D-7. Loading.** Connect with `CATALOG_MIGRATION_URL` (or `--database-url`). Check
  the schema is migrated (the TASK-4 tables exist). In one transaction:
  - without `--reset`: if any brand or product exists → stop, nothing changed;
    otherwise the catalog is empty of products and its categories (the seed's, or
    others with no products) are replaced;
  - with `--reset`: `TRUNCATE product, category_attribute, former_slug, brand,
    category` (the owner may; the service role may not);
  - then `COPY` each table, then `ANALYZE` the four tables; commit.
  The seed's six slugs are part of the generated tree, so a later `db:migrate` seeds
  nothing again (TASK-4 seed rule).
- **D-8. Memory.** Brands, categories and attributes are small arrays; products are
  produced by a generator function and written to the stream with back-pressure, so
  only one batch is in memory at a time. The summary prints the peak resident memory
  (`process.resourceUsage().maxRSS`) for NFR-002.

## Requirement mapping

| Requirement | Design | Verified by |
|---|---|---|
| FR-001 | D-1, D-2, D-5 | unit: two runs equal, another seed differs, a pinned hash of `--scale 1000 --seed demo` (checked on Windows and in CI on Linux) |
| FR-002 | `--scale` with `1k`, `100k`, `1m` or a number | unit: row counts for 1, 1 000 and an odd number |
| FR-003 | catalog description: tree, attributes of all five types, inherited ones | unit: about 20 leaves, all types used, every seeded slug present |
| FR-004 | brands per leaf | unit: about 50 brands, each in at least two leaves or marked as a specialist |
| FR-005 | D-6 | unit: names contain brand and line; price ranges per leaf; share of out-of-stock and published products within bounds |
| FR-006 | D-3 | unit: rank-frequency of a large run fits Zipf(1.1) (log-log slope within ±0.15); top brand ≥ 3 × median |
| FR-007 | D-5 | unit: ids parse as UUIDv7, increase with the row index |
| FR-008 | D-6, the catalog's constraints | int (catalog-service): load 2 000 products, `validateSpecs` of every product against its effective attributes → no error |
| FR-010, FR-012 | D-7 | int: a load as the owner; a load that fails half way leaves the tables as before |
| FR-011 | D-7 | int: refuses with products present, `--reset` replaces; categories-only catalog is replaced |
| FR-013 | the `catalog_app` default privileges of TASK-4 | int: the service, as `catalog_app`, lists, filters, reads by slug and patches a generated product |
| FR-014 | D-1 | unit: CSV files equal the loaded lines; hash equal with and without `--out` |
| FR-015 | summary line | unit: the summary has parameters, counts, hash, time |
| NFR-001 | D-7, D-8 | manual timed run on the local stack, recorded in the task notes |
| NFR-002 | D-8 | manual `--scale 1m` run, peak memory from the summary, in the task notes |

## Project Structure

```
tools/datagen/
  package.json            # "datagen", bin-less; scripts build, lint, typecheck, test, start
  src/
    cli.ts                # parseArgs, .env, runs generate + load, prints the summary
    random.ts             # splitmix32, sfc32, sub-streams, Zipf CDF, picks (D-2, D-3)
    ids.ts                # UUIDv7 from a time and random bits (D-5)
    csv.ts                # one row → one CSV line (D-1)
    catalog/              # the fixed description: tree, attributes, brands, lines (D-6)
    generate.ts           # rows of each table in order, as iterables
    load.ts               # checks, reset, COPY in one transaction (D-7)
    index.ts              # exports for the catalog-service test
  test/                   # unit tests
apps/catalog-service/test/datagen.int.test.ts   # FR-008, FR-010…FR-013 against the real catalog
package.json (root)       # "datagen": "pnpm --filter datagen start --"
```

## Docs touched in this task

- `README.md`: how to fill the catalog (`pnpm datagen …`), the scales, `--reset`.
- `docs/technologies.md`: rows for the generator (seeded PRNG, Zipf) and
  `pg-copy-streams`.
- `specs/005-datagen/quickstart.md`: the runs that prove the ACs.

## Decided with the owner

- Loads as the owner; refuses a catalog with brands or products unless `--reset`.
- Its own tree of about 20 leaves, reusing the seeded slugs.
- Catalog data only.
- Streamed into `COPY`; CSV files on request with the same content and hash.
