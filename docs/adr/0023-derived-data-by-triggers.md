# 0023. Derived data a database computes from its own rows is kept by triggers

- Status: accepted
- Date: 2026-11-21
- Deciders: project owner

## Context and problem statement

TASK-6 (`specs/006-storefront-browse/`, research R-4) needs a full-text search document
per product, built from columns of three tables: the product's name and description,
its brand's name and its category's name. The document must be right whoever writes
those rows: the catalog service, the data generator loading a million products with
`COPY` (TASK-5), or a manual fix in SQL. ADR 0022 §7 says "No triggers" — written for
*rules* (a tree without cycles, valid specs), which the service must check anyway to
answer with a precise `400` / `409`, so a trigger would be a second copy of the rule.
A derived column is not a rule: nothing is refused, a value is computed.

## Considered options

- The service computes the document on every write (and on a brand or category rename)
- A generated column
- Triggers in the database, the computation in one SQL function

## Decision

**Triggers, for derived data only.** A value a database computes from its own rows —
a search document today, a denormalised count or name tomorrow — is kept by triggers
calling one SQL function that holds the computation:

- the row's own trigger (`BEFORE INSERT OR UPDATE OF <the source columns>`) computes it;
- a change of another table's source column (`AFTER UPDATE OF name`) refreshes the rows
  that depend on it, touching only the derived column, so no trigger fires twice;
- every function sets its `search_path`, so no object in another schema can stand in;
- the migration that adds a trigger fills the existing rows.

Rules stay in the service, as ADR 0022 §7 says: a trigger never refuses a write.

Why not the service: the data generator's `COPY` and manual SQL bypass the service, and
the document would silently go stale. Why not a generated column: it cannot read other
tables.

## Consequences

- The search document is right for every writer, with its definition in one migration.
- Writes cost a little more: one trigger per product row (a `COPY` of a million rows
  included), and a brand or category rename rewrites the documents of its products
  in the same transaction — rare admin actions.
- Behaviour now lives in the database as well as the code; it is listed here and in
  the data model, and covered by integration tests, so it is not hidden.
- This amends ADR 0022 §7: "no triggers" now reads "no triggers for rules"; derived data
  may use them.
- Revisit if derived data needs other services' data (then events, ADR 0006) or if
  trigger cost shows in the write NFRs.
