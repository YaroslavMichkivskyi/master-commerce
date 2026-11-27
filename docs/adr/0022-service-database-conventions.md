# 0022. Service database conventions: UUIDv7, money in cents, soft delete, versions, cursor paging, least-privilege roles

- Status: accepted; amended by [0023](0023-derived-data-by-triggers.md) (triggers for derived data, §7)
- Date: 2026-11-20
- Deciders: project owner

## Context and problem statement

TASK-4 (`specs/004-catalog-model/`, research R-1…R-7, R-10, R-15) turns the catalog
database from one table into the shop's first real model: brands, a category tree with
attributes, products. Identity, orders and the other services will have databases of
their own (ADR 0003) and need the same answers to the same questions: how ids are made,
how money is stored, what deleting means, how two people editing one row are told
apart, how lists are paged, which rules the database keeps and with which rights the
service runs. Answered once here, they hold for every service database.

## Considered options

- Ids: bigint sequences; random UUIDv4; **UUIDv7 made by the database**
- Money: `numeric(12,2)` sent as a decimal string; a float; **integer cents**
- Deleting: `DELETE`; a boolean `is_deleted`; **`deleted_at` + `deleted_by`**
- Concurrent edits: last write wins; row locks held while editing; **versions with
  `If-Match`**
- Lists: `OFFSET` pages; **keyset (cursor) pages by id**
- Rights: the service as the owner of its schema; **an owner for migrations, a
  least-privilege role for the service**

## Decision

1. **Ids.** `id uuid DEFAULT uuid_v7()`, a SQL function created by a migration
   (RFC 9562: 48-bit milliseconds, then random bits). The database makes the id, so rows
   written without the service get the same kind. Ids grow with time: inserts land at
   the end of the index, and paging by id is paging by creation time. Unlike sequences
   they do not tell the size of a table or let ids be guessed.
2. **Money.** `*_cents integer` with a `CHECK`, `…Cents` integers in the API; one
   currency (EUR), VAT included. Exact in JSON, JavaScript and SQL; formatting is the
   client's.
3. **Soft delete.** `deleted_at` and `deleted_by` (`CHECK (deleted_at IS NOT NULL OR
   deleted_by IS NULL)`), no boolean that could disagree with them. Every read leaves
   deleted rows out; `POST …/{id}/restore` brings one back. Uniqueness among live rows
   is a partial unique index (`UNIQUE (slug) WHERE deleted_at IS NULL`).
4. **Audit.** `created_at`, `created_by`, `updated_at`, `updated_by` on every entity;
   the `*_by` columns are null until sign-in exists (TASK-7).
5. **Versions.** `version integer` bumped by every change in the same statement
   (`UPDATE … SET …, version = version + 1 WHERE id = $1 AND version = $2`). Responses
   carry the version in the body and as `ETag: "<version>"`; every change needs
   `If-Match` — missing `428`, stale `412` with the current version in the detail
   (RFC 9110, RFC 6585).
6. **Paging.** `?limit=1..200&cursor=<id>`, `WHERE id > $cursor ORDER BY id LIMIT
   $limit + 1`, response `{ items, nextCursor }`; partial indexes `(<filter>, id)` on
   live rows. A page costs the same at any depth.
7. **Rules: the database or the service.** The database keeps every rule of one row
   (`NOT NULL`, `CHECK` on formats, lengths, ranges, consistency of columns), every
   reference (FK) and uniqueness among live rows. Rules that read other rows (a tree
   without cycles, values valid for the attributes of a category) are the service's,
   checked inside one transaction that locks what the rule depends on (`FOR UPDATE` /
   `FOR SHARE`, or a transaction-scoped advisory lock for what is not a row yet: a slug
   being taken, the shape of a tree). No triggers: each would repeat a rule the service
   has to check anyway to answer with a precise `400` / `409`.
8. **Former slugs.** A changed slug is kept in a `former_slug (kind, slug, entity_id)`
   table: lookups by slug find the entity by an old one, and an old slug is never given
   to another entity, so old links never lead elsewhere.
9. **Roles.** Two roles per service database. The owner (`<service>`) runs only the
   migration step (`pnpm --filter <service> db:migrate`: migrations, the app role's
   password, the idempotent seed). The service logs in as `<service>_app`:
   `NOSUPERUSER NOCREATEDB NOCREATEROLE`, a connection limit, `statement_timeout = 5s`,
   `SELECT, INSERT, UPDATE` on its tables, `EXECUTE` on its functions — no `DELETE`
   (deletion is soft), no `TRUNCATE`, no DDL; `ALTER DEFAULT PRIVILEGES` covers tables
   later migrations add. The service refuses to start as a superuser or as the owner.
   Local database ports listen on `127.0.0.1` only.

## Consequences

- Every service database looks the same: one set of helpers per service (versioned
  update, cursor page, former slugs), one way for clients to edit safely.
- A stolen or misused service connection cannot drop, truncate or hard-delete data,
  nor change the schema; a runaway query is stopped after 5 s.
- Deleted rows stay and take space; purging them (with the history TASK-30 adds) is a
  later, deliberate job of the owner role.
- Every client of a write must read first and send the version; that is the price of
  never losing an edit silently.
- PostgreSQL 18 has `uuidv7()` built in: on that upgrade the function is replaced, the
  ids stay.
- Revisit integer cents if a price ever needs fractions of a cent or another currency.
