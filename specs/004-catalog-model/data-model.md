# Data model: Catalog model

PostgreSQL `catalog` database (ADR 0003). Decisions: [research.md](research.md).

## Common columns (every table but `former_slug`)

| Column | Type | Rule |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT uuid_v7()` (R-1); `category` keeps its v4 ids from TASK-2 |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |
| `created_by` | `uuid` | NULL until TASK-7 |
| `updated_at` | `timestamptz` | NOT NULL, `DEFAULT now()`, set by every update |
| `updated_by` | `uuid` | NULL until TASK-7 |
| `deleted_at` | `timestamptz` | NULL = live (R-3) |
| `deleted_by` | `uuid` | NULL until TASK-7; `CHECK (deleted_at IS NOT NULL OR deleted_by IS NULL)` |
| `version` | `integer` | NOT NULL, `DEFAULT 1`, `CHECK (version > 0)`, +1 on every update (R-4) |

Shared formats:
- **name**: `CHECK (char_length(name) BETWEEN 1 AND 200)` (category, brand: 1–100, as
  `CategoryDto`), no leading / trailing spaces: `CHECK (name = btrim(name))`.
- **slug**: `CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100)`.
- **code** (attribute): `CHECK (code ~ '^[a-z][a-z0-9_]*$' AND char_length(code) <= 50)`.
- **sku**: `CHECK (sku ~ '^[A-Z0-9][A-Z0-9-]*$' AND char_length(sku) <= 40)`.

## `brand`
| Column | Rule |
|---|---|
| `name` | 1–100 |
| `slug` | slug format; `UNIQUE (slug) WHERE deleted_at IS NULL` |

## `category` (from TASK-2, extended)
| Column | Rule |
|---|---|
| `name` | 1–100 |
| `slug` | slug format; `UNIQUE (slug) WHERE deleted_at IS NULL` (replaces TASK-2's full unique) |
| `sort_order` | integer, NOT NULL, default 0 |
| `parent_id` | `uuid` NULL, FK → `category(id)`; `CHECK (parent_id <> id)` |

Indexes: `(parent_id) WHERE deleted_at IS NULL`.
Service rules (R-7): no cycles; a category with live products has no live children.

## `category_attribute`
| Column | Rule |
|---|---|
| `category_id` | FK → `category(id)`, NOT NULL |
| `code` | code format; `UNIQUE (category_id, code) WHERE deleted_at IS NULL` |
| `name` | 1–100 |
| `type` | `CHECK (type IN ('select','multi_select','number','boolean','text'))` |
| `required` | boolean, NOT NULL |
| `allowed_values` | `text[]` NULL; `CHECK ((type IN ('select','multi_select')) = (allowed_values IS NOT NULL AND cardinality(allowed_values) > 0))` |
| `unit` | `text` NULL, 1–20; only for `number` |
| `min_value`, `max_value` | `numeric` NULL; only for `number`; `CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)` |
| `whole_numbers` | boolean NOT NULL default false; true only for `number` |
| `max_length` | `integer` NULL; `CHECK ((type = 'text') = (max_length IS NOT NULL))`, 1–500 |
| `sort_order` | integer, NOT NULL, default 0 |

The attributes of a category are replaced as a set (R-9); their rows carry the common
columns so a replaced attribute is soft deleted, not lost.
Service rule: a code is unique along the path from the root to every leaf.

## `product`
| Column | Rule |
|---|---|
| `name` | 1–200 |
| `slug` | slug format, ≤ 100; `UNIQUE (slug) WHERE deleted_at IS NULL` |
| `sku` | sku format; `UNIQUE (sku) WHERE deleted_at IS NULL` |
| `description` | `text` NOT NULL default `''`, ≤ 10 000 |
| `brand_id` | FK → `brand(id)`, NOT NULL |
| `category_id` | FK → `category(id)`, NOT NULL |
| `price_cents` | `integer` NOT NULL, `CHECK (price_cents > 0)` |
| `stock` | `integer` NOT NULL default 0, `CHECK (stock >= 0)` |
| `specs` | `jsonb` NOT NULL default `'{}'`, `CHECK (jsonb_typeof(specs) = 'object')` |
| `published` | boolean NOT NULL default false |

Indexes (all `WHERE deleted_at IS NULL`): `(category_id, id)`, `(brand_id, id)`,
`(published, id)`.
Service rules: specs valid against the category's effective attributes (R-8); the
category is a leaf; brand and category are live.

## `former_slug`
| Column | Rule |
|---|---|
| `kind` | `CHECK (kind IN ('brand','category','product'))` |
| `slug` | slug format; `PRIMARY KEY (kind, slug)` |
| `entity_id` | `uuid` NOT NULL (the brand / category / product) |
| `retired_at` | `timestamptz` NOT NULL default `now()` |

Index: `(kind, entity_id)`.
Service rule: a live entity's current slug is never another entity's former slug.

## Function
`uuid_v7() RETURNS uuid` — `VOLATILE`, SQL, RFC 9562 layout (R-1).

## Roles (R-15)

| Role | Rights |
|---|---|
| `catalog` (owner) | everything; used only by `db:migrate` |
| `catalog_app` (service) | `CONNECT`; `USAGE` on `public`; `SELECT, INSERT, UPDATE` on every catalog table, also on tables added later (default privileges); `EXECUTE` on `uuid_v7()`; no `DELETE`, `TRUNCATE`, `CREATE`; `statement_timeout` 5 s, 20 connections |
