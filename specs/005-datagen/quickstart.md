# Quickstart: validate the data generator

## Prerequisites
- The stack runs as before (`specs/004-catalog-model/quickstart.md`); the catalog
  database is migrated (`pnpm dev` does it, or `pnpm --filter catalog-service
  db:migrate`).
- The generator loads as the owner (`CATALOG_MIGRATION_URL` in `.env`).
- `--reset` below replaces the whole local catalog; leave it out on a catalog you want
  to keep, and the command refuses instead.

## Scenarios

1. **The same seed, the same catalog (FR-001, AC #1).**
   ```
   pnpm datagen --scale 1k --seed demo --no-load
   pnpm datagen --scale 1k --seed demo --no-load
   pnpm datagen --scale 1k --seed other --no-load
   ```
   The first two print the same `hash:` — the one the unit tests pin
   (`a2986c3d…`), on Windows, macOS and Linux alike; the third prints another.

2. **CSV with the same content (FR-014).**
   `pnpm datagen --scale 1k --seed demo --no-load --out ./datagen-out` writes
   `brand.csv`, `category.csv`, `category_attribute.csv` and `product.csv`, and prints
   the same hash as scenario 1. Delete the folder afterwards.

3. **100 000 products in under 2 minutes (NFR-001, AC #2).**
   ```
   pnpm datagen --scale 100k --seed demo --reset
   ```
   The summary says `loaded into localhost:<port>/catalog; <s> s` with `<s>` < 120.

4. **The catalog works with them (FR-013, AC #3).** With `pnpm dev` running:
   ```
   curl -s "http://localhost:3001/api/v1/admin/catalog/products?limit=3"
   curl -s http://localhost:3001/api/v1/admin/catalog/categories/tree
   curl -s http://localhost:3001/api/v1/categories
   ```
   Products with specs, prices and stock; the tree with Components, Storage,
   Peripherals, Computers and Networking; the public list with `parentId`.

5. **It refuses to overwrite (FR-011).** `pnpm datagen --scale 1k` without `--reset`
   on the loaded catalog → `the catalog holds … brands and … products; nothing was
   changed`, exit code 1.

6. **1 000 000 products, bounded memory (NFR-002).**
   `pnpm datagen --scale 1m --seed demo --reset` → `peak memory` in the summary stays
   under 512 MB.

7. **Bad input.** `pnpm datagen --scale 0` or `--bogus` → one line saying what is wrong,
   exit code 1; on a database that is not migrated → "the catalog schema is not
   migrated … run pnpm --filter catalog-service db:migrate first".
