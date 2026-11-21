# HTTP contracts: Storefront browse

Review copy of what the code must produce; both services' OpenAPI documents are
generated from code (ADR 0014). Every endpoint is `@Public()` and read-only.

## Paths
- catalog-service: `/storefront/...`
- api-gateway: `/api/v1/catalog/...`, the same paths after the prefix (ADR 0021).

## List parameters (category, brand, search)

| Parameter | Meaning |
|---|---|
| `brand` | brand slugs, comma-separated (brand pages: ignored) |
| `price` | euros, `min-max`, either side optional (`200-`, `-500`) |
| `stock` | `in` → in stock only |
| `sort` | `new` (default), `price-asc`, `price-desc`, `name`, `relevance` (search default) |
| `page` | 1…100, default 1 |
| `category` | search only: a category slug (its subtree) |
| `<attribute code>` | values comma-separated; for `number` attributes `min-max` |

Malformed values (`page=abc`, `price=x`) → `400` problem with `errors[]`. Unknown
parameters and attribute codes the category does not have are ignored.

## Endpoints

| Method and path | Answers |
|---|---|
| `GET /storefront/categories` | `200` tree: `{ items: [{ id, name, slug, productCount, children }] }`, counts of published products in the subtree |
| `GET /storefront/categories/{slug}/products` | `200` list page (below) with `category: { id, name, slug, path, children }`; `404` |
| `GET /storefront/brands/{slug}/products` | `200` list page with `brand: { id, name, slug }` and a category facet; `404` |
| `GET /storefront/search?q=` | `200` list page with brand and category facets; `400` for an empty `q` |
| `GET /storefront/products/{slug}` | `200` product (below); `404` unknown, deleted or unpublished |
| `GET /storefront/new?limit=12` | `200` `{ items: [card] }`, newest published products |
| `GET /storefront/sitemap` | `200` `{ categories: [{ slug, updatedAt }], brands: [...], productParts: n }` |
| `GET /storefront/sitemap/products/{part}` | `200` `{ items: [{ slug, updatedAt }] }`, at most 50 000 |

A read by slug with a former slug answers the entity with its **current** slug; the
storefront redirects (research R-5).

### List page
```json
{
  "category": { "id": "…", "name": "Graphics cards", "slug": "graphics-cards",
                "path": [{ "name": "Components", "slug": "components" }],
                "children": [] },
  "items": [ { "id": "…", "name": "ASUS TUF Gaming GeForce RTX 6070 12GB",
               "slug": "asus-tuf-gaming-geforce-rtx-6070-12gb-1x2", "brand": { "name": "ASUS", "slug": "asus" },
               "priceCents": 64999, "inStock": true,
               "highlights": [{ "name": "Chipset", "value": "GeForce RTX 6070" }, { "name": "Memory size", "value": "12 GB" }] } ],
  "total": 1234, "page": 1, "pageSize": 24, "pageCount": 52,
  "sort": "new",
  "facets": [
    { "code": "brand", "name": "Brand", "kind": "values", "values": [{ "value": "asus", "label": "ASUS", "count": 310, "selected": true }] },
    { "code": "price", "name": "Price", "kind": "range", "min": 19999, "max": 199999, "unit": "EUR cents" },
    { "code": "memory_type", "name": "Memory type", "kind": "values", "values": [{ "value": "GDDR7", "label": "GDDR7", "count": 120, "selected": false }] },
    { "code": "memory_size", "name": "Memory size", "kind": "range", "unit": "GB", "min": 8, "max": 32, "selected": { "min": 12 } }
  ]
}
```
The kind follows the attribute's type (FR-002, FR-003): `select`, `multi_select`,
`boolean` → `values` (with counts); `number` and the price → `range` (lowest and
highest among the products matching the other filters). A `boolean` facet has the
values `true` / `false`, labelled "Yes" / "No".

### Product
```json
{ "id": "…", "name": "…", "slug": "…", "sku": "ASU-GRA-1X2", "description": "…",
  "brand": { "name": "ASUS", "slug": "asus" },
  "category": { "name": "Graphics cards", "slug": "graphics-cards",
                "path": [{ "name": "Components", "slug": "components" }] },
  "priceCents": 64999, "inStock": true, "updatedAt": "…",
  "specs": [{ "code": "memory_size", "name": "Memory size", "type": "number", "unit": "GB", "value": 12 }] }
```

## Web addresses

| Address | Page |
|---|---|
| `/` | home: top categories, newest products |
| `/c/<slug>?<list parameters>` | category |
| `/brands/<slug>?<list parameters>` | brand |
| `/p/<slug>` | product |
| `/search?q=…&<list parameters>` | search |
| `/robots.txt`, `/sitemap.xml`, `/sitemap/<n>.xml` | SEO |
