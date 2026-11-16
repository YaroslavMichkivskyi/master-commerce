# HTTP contracts: Catalog model

Review copy of what the code must produce; the OpenAPI documents of both services are
generated from code (ADR 0014). Every endpoint below is `@Public()` until TASK-7. Errors
are problem details (TASK-3 contracts); the statuses listed are the ones each endpoint
answers on purpose.

## Paths

- catalog-service (internal): `/admin/...`
- api-gateway (public door, guarded by TASK-7): `/api/v1/admin/catalog/...`, the same
  paths after the prefix, forwarded unchanged (ADR 0021).

## Conventions

- **Versions** (FR-033): every entity in a response has `version`; single-entity
  responses also send `ETag: "<version>"`. Every write except create needs
  `If-Match: "<version>"`: stale → `412`, missing → `428`.
- **Lists** (FR-034): `?limit=1..200` (default 50) `&cursor=<id>`; response
  `{ "items": [...], "nextCursor": "<id>" | null }`.
- **Deleted** rows are absent from every read; `POST …/{id}/restore` brings one back.
- **Lookups by slug** (FR-025): `GET …/by-slug/{slug}` finds a live entity by its current
  or a former slug; the body's `slug` is the current one.
- **Audit fields** in every entity: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
  (`null` until TASK-7).

## Brands (FR-001, FR-002)

| Method and path | Body | Answers |
|---|---|---|
| `POST /admin/brands` | `{ name, slug }` | `201` brand; `400`; `409` slug taken |
| `GET /admin/brands` | — | `200` page of brands |
| `GET /admin/brands/{id}` | — | `200`; `404` |
| `GET /admin/brands/by-slug/{slug}` | — | `200`; `404` |
| `PATCH /admin/brands/{id}` | `{ name?, slug? }` | `200`; `400`; `404`; `409`; `412`; `428` |
| `DELETE /admin/brands/{id}` | — | `204`; `404`; `409` "N products use this brand"; `412`; `428` |
| `POST /admin/brands/{id}/restore` | — | `200`; `404`; `409` slug taken; `412`; `428` |

Brand: `{ id, name, slug, version, createdAt, createdBy, updatedAt, updatedBy }`.

## Categories and attributes (FR-010 … FR-015)

| Method and path | Body | Answers |
|---|---|---|
| `POST /admin/categories` | `{ name, slug, sortOrder?, parentId? }` | `201`; `400`; `404` parent; `409` slug taken, or the parent holds products |
| `GET /admin/categories/tree` | — | `200` the whole tree, each node with its own attributes and `children` |
| `GET /admin/categories/{id}` | — | `200` with `attributes` (own) and `inheritedAttributes`; `404` |
| `GET /admin/categories/by-slug/{slug}` | — | as above |
| `PATCH /admin/categories/{id}` | `{ name?, slug?, sortOrder?, parentId? }` | `200`; `400`; `404`; `409` (cycle, the new parent holds products, products would break, slug taken); `412`; `428` |
| `PUT /admin/categories/{id}/attributes` | `{ attributes: Attribute[] }` | `200` category; `400`; `404`; `409` (code repeats an ancestor's or a descendant's, products would break); `412`; `428` |
| `DELETE /admin/categories/{id}` | — | `204`; `404`; `409` (has children, or N products); `412`; `428` |
| `POST /admin/categories/{id}/restore` | — | `200`; `404`; `409` (slug taken, parent deleted); `412`; `428` |

Attribute: `{ code, name, type, required, sortOrder, allowedValues?, unit?, minValue?,
maxValue?, wholeNumbers?, maxLength? }`, `type` ∈ `select | multi_select | number |
boolean | text`; the limits a type does not use are refused (`400`).

Example (US-1):

```json
PUT /admin/categories/0193…/attributes   If-Match: "1"
{ "attributes": [
  { "code": "chipset", "name": "Chipset", "type": "text", "required": true, "maxLength": 50, "sortOrder": 10 },
  { "code": "memory_size", "name": "Memory size", "type": "number", "required": true, "unit": "GB", "minValue": 1, "maxValue": 64, "wholeNumbers": true, "sortOrder": 20 },
  { "code": "memory_type", "name": "Memory type", "type": "select", "required": true, "allowedValues": ["GDDR6", "GDDR6X", "GDDR7"], "sortOrder": 30 },
  { "code": "ray_tracing", "name": "Ray tracing", "type": "boolean", "required": false, "sortOrder": 40 }
] }
```

## Products (FR-020 … FR-025)

| Method and path | Body | Answers |
|---|---|---|
| `POST /admin/products` | `{ name, slug, sku, description?, brandId, categoryId, priceCents, stock?, specs }` | `201` (unpublished); `400` incl. specs errors; `404` brand / category; `409` (slug / SKU taken, category has children) |
| `GET /admin/products` | `?categoryId&brandId&published` + paging | `200` page |
| `GET /admin/products/{id}` | — | `200`; `404` |
| `GET /admin/products/by-slug/{slug}` | — | `200`; `404` |
| `PATCH /admin/products/{id}` | any of the create fields | `200`; `400`; `404`; `409`; `412`; `428` |
| `POST /admin/products/{id}/publish`, `/unpublish` | — | `200`; `404`; `412`; `428` |
| `DELETE /admin/products/{id}` | — | `204`; `404`; `412`; `428` |
| `POST /admin/products/{id}/restore` | — | `200`; `404`; `409` (slug / SKU taken, brand or category deleted); `412`; `428` |

Product: `{ id, name, slug, sku, description, brandId, categoryId, priceCents, stock,
specs, published, version, createdAt, createdBy, updatedAt, updatedBy }`.

Specs error (US-3):

```json
{ "type": "about:blank", "title": "Bad Request", "status": 400,
  "detail": "The request is invalid", "instance": "/admin/products",
  "errors": [
    { "field": "specs.memory_size", "messages": ["memory_size must be a whole number from 1 to 64"] },
    { "field": "specs.memory_type", "messages": ["memory_type must be one of GDDR6, GDDR6X, GDDR7"] },
    { "field": "specs.colour", "messages": ["colour is not an attribute of Graphics cards"] } ] }
```

## Public (changed)

- `GET /categories` (catalog) and `GET /api/v1/categories` (gateway): each item also has
  `parentId: string | null`; deleted categories are absent (FR-014).
