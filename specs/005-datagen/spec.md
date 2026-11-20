# Feature Specification: Data generator

**Feature Branch**: `task-5`
**Spec folder**: `specs/005-datagen/`
**Task**: TASK-5 — `backlog/tasks/task-5 - Data-generator-deterministic-skewed-hardware-catalog.md`
**Mode**: speckit-light
**Status**: Approved (2026-11-21)
**Created**: 2026-11-21
**Input**: "Data generator: deterministic, skewed hardware catalog"

---

## Scope

A developer tool that fills the catalog database with a realistic computer-hardware
catalog of a chosen size: a category tree with attributes, brands, and products with
specs, prices, stock and publication. The same seed always gives the same catalog, so
demos, load tests and bug reports can be repeated exactly. Products are spread over
brands the way real shops are — many products from a few brands. The tool writes
straight into the catalog database in bulk, for speed, and checks its own products
against the catalog's rules. Touches: a new tool in the repo, the catalog database;
the catalog service and its API are used as they are.

---

## Goal

A developer runs one command with a scale and a seed and, within a couple of minutes,
has a catalog of 100 000 products that the storefront, the admin API and load tests can
work with — and anyone who runs the same command gets the same catalog, down to the
last byte.

**Acceptance**
- Given the same seed and the same parameters, when the tool runs twice (on any
  machine, OS, time zone or locale), then both runs report the same data hash; a
  different seed gives a different hash. *(TASK-5 AC #1)*
- Given a migrated, empty catalog database on the local stack, when the tool loads
  100 000 products, then it finishes in under 2 minutes, generation included.
  *(TASK-5 AC #2)*
- Given a generated catalog, when every product's specs are checked against the
  effective attributes of its category with the catalog's own validation, then none
  fails; the catalog service then reads, lists, filters and changes those products
  through its admin API like any other. *(TASK-5 AC #3)*
- Given a generated catalog, when products are counted per brand within a category,
  then the counts fall off with the brand's rank as a Zipf distribution with the given
  exponent: the most common brand has several times the products of the median one.
- Given a catalog that already holds products, when the tool is run without the reset
  option, then it refuses and changes nothing; with the reset option it replaces the
  whole catalog.

### Edge Cases
- The schema is not migrated, or the database is unreachable → the tool stops with a
  message saying which, before generating anything.
- The load fails half way (a broken connection, a constraint) → nothing of it stays in
  the database.
- A scale of 1 product, or one far larger than the tree has natural models for → the
  tool still produces a valid catalog: names, slugs and SKUs stay unique.

---

## Functional Requirements

### Generation
- **FR-001** The tool MUST be deterministic: the seed and the parameters alone decide
  every value, identifiers and timestamps included; nothing depends on the clock, the
  machine, the OS, the time zone or the locale. It MUST report a hash of the generated
  data that is equal for equal inputs.
- **FR-002** The scale MUST be a number of products (1 or more), with named presets for
  1 000, 100 000 and 1 000 000.
- **FR-003** The tool MUST build a category tree of two or three levels with about 20
  leaf categories of computer hardware (processors, graphics cards, motherboards,
  memory, SSDs and hard drives, power supplies, cases, cooling, monitors, keyboards,
  mice, laptops…). Each leaf has attributes that fit it, together using all five
  attribute types; some attributes are defined on an inner category and inherited.
  The six categories the catalog seeds are part of the tree under their slugs.
- **FR-004** The tool MUST create the brands of computer hardware that make those
  products (about 50); a brand makes products in several categories, and each category
  has its own set of brands.
- **FR-005** Every product MUST have a name built from its brand, product line, model
  and key specs; a unique slug and SKU; a short description; a price in euro cents in
  a plausible range for its category that grows with its key specs; a stock quantity
  where some products are out of stock; and a publication flag, most products being
  published. Optional attributes are sometimes left out.
- **FR-006** Products per brand within a category MUST follow a Zipf distribution
  over the brands' ranks; the exponent is a parameter, 1.1 by default.
- **FR-007** Generated identifiers MUST have the catalog's identifier format (UUIDv7,
  ADR 0022) and grow with the generated creation time, so the catalog's ordering and
  cursor paging by identifier work on generated data as on data written by the
  service. Creation times lie in a fixed past window.
- **FR-008** Every generated product MUST satisfy every rule the catalog enforces: the
  database constraints and the specs validation against the effective attributes of
  its category (TASK-4 FR-023).

### Loading
- **FR-010** The tool MUST load the data in bulk into the catalog database as the
  database owner (the role migrations use), into an already migrated schema.
- **FR-011** Without the reset option the tool MUST refuse to load into a catalog that
  holds any brand or product. With it, the tool MUST first remove every catalog row
  (categories, attributes, brands, products, former slugs) and then load.
- **FR-012** A load MUST be all or nothing: if it fails, the database is as before.
- **FR-013** After a load, the running catalog service MUST work with the loaded data
  without a restart, with its own least-privilege role (TASK-4 FR-043).
- **FR-014** On request the tool MUST also write the generated data as CSV files, one
  per table, with exactly the content it loads (or instead of loading).
- **FR-015** The tool MUST print what it did: the parameters, the number of rows per
  table, the data hash and the time taken.

### Non-functional
- **NFR-001** 100 000 products: generated and loaded in under 2 minutes on the local
  stack.
- **NFR-002** 1 000 000 products: generated and loaded with the tool's memory staying
  under 512 MB, independent of the scale.

### Key Entities
- The catalog's own (TASK-4): **category** with **attributes**, **brand**, **product**
  with specs. The generator adds none.

---

## Out of Scope
- Customers, carts and orders — added to the generator by the tasks that introduce
  them (TASK-7, TASK-9, TASK-10).
- Product images — TASK-16.
- Search indexes — TASK-6 (they are built from the loaded rows like from any other).
- Loading through the admin API — far slower than bulk loading; the API is exercised
  on the generated data by the tests instead (FR-013).
- Real product data from any shop or manufacturer; names and models are invented,
  only brand names are real.

## Explicitly Not Restated Here
- The catalog's model and its rules — TASK-4 (`specs/004-catalog-model/`), ADR 0022.
- Database roles and the migration step — TASK-4 FR-041…FR-043.
- Cross-platform, versions pinned, everything in English — constitution, `AGENTS.md`.

## Assumptions
- The generated catalog replaces the seed's six categories in place (same slugs, same
  names); after a reset their identifiers change, which nothing outside the catalog
  holds yet.
- "Plausible" prices and specs are judged by a developer reading samples, not by
  matching any real price list.
- The hash covers the generated rows in a fixed order and a fixed text form, so it is
  the same whether the data is loaded or written as CSV.

## Clarifications

### Session 2026-11-21
- Q: With which rights does it load, and what happens to existing data? → A: as the
  owner; refuses a non-empty catalog unless the reset option is given (FR-010, FR-011).
- Q: Which category tree? → A: its own tree of about 20 leaves, reusing the seeded
  categories by slug (FR-003).
- Q: What does TASK-5 generate? → A: the catalog only; later tasks add their entities
  (Out of Scope).
- Q: Output form? → A: streamed into the bulk load; CSV files on request, same content
  and hash (FR-014).

---

## Review & Acceptance Checklist
- [x] No implementation details (languages, frameworks, APIs) in requirements
- [x] Every requirement is testable and unambiguous; IDs are stable
- [x] Every US has Given / then acceptance; edge cases listed
- [x] Scope is bounded; Out of Scope names the owning task where relevant
- [x] Matches the backlog task's acceptance criteria
- [x] No speculative features or extension points (mvp-plan.md §2)
- [x] Every new / changed endpoint is listed — no endpoints are added or changed
- [x] No `[NEEDS CLARIFICATION]` markers remain
