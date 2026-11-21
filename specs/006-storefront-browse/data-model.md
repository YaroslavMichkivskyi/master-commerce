# Data model: Storefront browse

Changes to the catalog database of TASK-4 (`specs/004-catalog-model/data-model.md`).

## `product` (extended)

| Column | Type and rules |
|---|---|
| `search` | `tsvector` NOT NULL DEFAULT `''`: name (weight A), brand name (B), category name (C), description (D), `english` configuration (research R-4) |

Indexes (all partial on `deleted_at IS NULL AND published`):
- `product_search_live` — GIN on `search`;
- `product_storefront_category` — `(category_id)`;
- `product_storefront_brand` — `(brand_id)`.

## Functions and triggers (one migration, custom SQL)

- `catalog_search_document(name text, brand text, category text, description text)
  RETURNS tsvector IMMUTABLE` — the weighted document.
- `product_search_refresh` — `BEFORE INSERT OR UPDATE OF name, description, brand_id,
  category_id ON product`: sets `NEW.search` from the row and the names of its brand
  and category.
- `brand_search_refresh` — `AFTER UPDATE OF name ON brand`: refreshes `search` of that
  brand's products; `category_search_refresh` the same for a category's products.
- The migration fills `search` for the rows already there.

The service role `catalog_app` needs nothing new: the triggers run with the rights of
the statement, on tables it may already update.

## Unchanged
Every other table and rule of TASK-4. No new table.
