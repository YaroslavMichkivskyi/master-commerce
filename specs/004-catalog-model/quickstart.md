# Quickstart: validate the catalog model

## Prerequisites
- The stack runs as before (`specs/003-service-core/quickstart.md`): Node.js 24,
  `corepack enable`, Docker.
- `pnpm dev`. On an existing `.env` it adds `CATALOG_APP_PASSWORD` and
  `CATALOG_MIGRATION_URL`; `CATALOG_DATABASE_URL` must name `catalog_app`, as in
  `.env.example` — the service refuses to start as the owner. `pnpm dev` applies the
  migrations (`db:migrate`) before it starts the apps.
- The commands are for a POSIX shell (Git Bash on Windows, any terminal on macOS /
  Linux). `G` is the gateway's admin API; copy the ids the answers print into the
  variables named.

```
G=http://localhost:3001/api/v1/admin/catalog
J='content-type: application/json'
```

## Scenarios

1. **The API is documented (FR-050, FR-051).** http://localhost:3001/docs lists the 24
   operations under `admin: brands`, `admin: categories`, `admin: products`, each
   "Auth: public" with its answers; http://localhost:3002/docs lists the same under
   `/admin/...`.

2. **A category with inherited attributes (US-1, AC #1).**
   ```
   curl -si $G/categories/by-slug/graphics-cards        # seeded, ETag "1"; GPU=<id>
   curl -si -X POST $G/categories -H "$J" -d '{"name":"Components","slug":"components"}'
   # COMP=<id>, ETag "1"
   curl -s -X PUT $G/categories/$COMP/attributes -H "$J" -H 'If-Match: "1"' \
     -d '{"attributes":[{"code":"warranty_months","name":"Warranty","type":"number","required":false,"unit":"months"}]}'
   curl -s -X PATCH $G/categories/$GPU -H "$J" -H 'If-Match: "1"' -d "{\"parentId\":\"$COMP\"}"
   curl -s -X PUT $G/categories/$GPU/attributes -H "$J" -H 'If-Match: "2"' -d '{"attributes":[
     {"code":"chipset","name":"Chipset","type":"text","required":true,"maxLength":50,"sortOrder":10},
     {"code":"memory_size","name":"Memory size","type":"number","required":true,"unit":"GB","minValue":1,"maxValue":64,"wholeNumbers":true,"sortOrder":20},
     {"code":"memory_type","name":"Memory type","type":"select","required":true,"allowedValues":["GDDR6","GDDR6X","GDDR7"],"sortOrder":30},
     {"code":"length_mm","name":"Length","type":"number","required":false,"unit":"mm","minValue":1,"sortOrder":40},
     {"code":"ray_tracing","name":"Ray tracing","type":"boolean","required":false,"sortOrder":50}]}'
   curl -s $G/categories/tree
   ```
   The answer has the five attributes and `inheritedAttributes: [warranty_months]`;
   the tree shows Graphics cards under Components.

3. **A product with valid specs (US-2, AC #1).**
   ```
   curl -s -X POST $G/brands -H "$J" -d '{"name":"ASUS","slug":"asus"}'    # ASUS=<id>
   curl -si -X POST $G/products -H "$J" -d "{\"name\":\"ASUS Dual GeForce RTX 4060 8GB\",
     \"slug\":\"asus-dual-rtx-4060\",\"sku\":\"ASUS-DUAL-RTX4060-O8G\",\"brandId\":\"$ASUS\",
     \"categoryId\":\"$GPU\",\"priceCents\":32999,\"stock\":12,
     \"specs\":{\"chipset\":\"GeForce RTX 4060\",\"memory_size\":8,\"memory_type\":\"GDDR6\",\"warranty_months\":36}}"
   # 201, "published": false, ETag "1"; P=<id>
   curl -s -X PATCH $G/products/$P -H "$J" -H 'If-Match: "1"' -d '{"priceCents":29999,"slug":"asus-dual-rtx-4060-8gb"}'
   curl -s $G/products/by-slug/asus-dual-rtx-4060        # found by the old slug, slug is the new one
   curl -s -X POST $G/products/$P/publish -H 'If-Match: "2"'
   ```
   Creating a child of Graphics cards now answers `409`: it holds a product.
   ```
   curl -s -X POST $G/categories -H "$J" -d "{\"name\":\"X\",\"slug\":\"x\",\"parentId\":\"$GPU\"}"
   ```

4. **Invalid specs are refused (US-3, AC #2).**
   ```
   curl -s -X POST $G/products -H "$J" -d "{\"name\":\"Bad\",\"slug\":\"bad\",\"sku\":\"BAD-1\",
     \"brandId\":\"$ASUS\",\"categoryId\":\"$GPU\",\"priceCents\":100,
     \"specs\":{\"chipset\":\"AD107\",\"memory_size\":\"8\",\"memory_type\":\"HBM\",\"colour\":\"black\"}}"
   ```
   `400` with `errors[]` naming `specs.memory_size`, `specs.memory_type` and
   `specs.colour`; nothing is stored.

5. **Versions (FR-033).** Repeat the `PATCH` of scenario 3 with `If-Match: "1"` → `412`
   with the current version in `detail`; without `If-Match` → `428`.

6. **An attribute change that would break products (FR-013).** Make `length_mm`
   required (`PUT …/attributes` with the category's current `ETag`) → `409` "1 product
   would have invalid specs"; adding a new optional attribute is stored.

7. **Retire and restore (US-5).**
   ```
   curl -s -X DELETE $G/brands/$ASUS -H 'If-Match: "1"'           # 409 "1 product uses this brand"
   curl -si -X DELETE $G/products/$P -H 'If-Match: "3"'           # 204
   curl -s $G/products/$P                                         # 404; the row stays
   curl -s -X POST $G/products/$P/restore -H 'If-Match: "4"'      # 200, version 5
   ```

8. **The database guards itself (US-4, AC #4, FR-043).**
   ```
   docker compose exec postgres-catalog psql -U catalog -d catalog -c \
     "update product set price_cents = -1"            # ERROR: product_price_positive
   docker compose exec -e PGPASSWORD=catalog_app_local postgres-catalog \
     psql -h localhost -U catalog_app -d catalog -c "delete from product"
   # ERROR: permission denied for table product
   ```

9. **Migrations from scratch (AC #3).** `pnpm reset`, then `pnpm dev`: the migrations
   build the schema, the seed adds its six categories, the service starts as
   `catalog_app`.
