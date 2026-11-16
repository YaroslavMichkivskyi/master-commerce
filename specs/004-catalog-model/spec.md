# Feature Specification: Catalog model

**Feature Branch**: `task-4`
**Spec folder**: `specs/004-catalog-model/`
**Task**: TASK-4 — `backlog/tasks/task-4 - Catalog-model-brands-categories-attributes-products-admin-API.md`
**Mode**: speckit-full
**Status**: Draft, clarified (2026-11-15)
**Created**: 2026-11-15
**Input**: "Catalog model: brands, categories, attributes, products, admin API"

---

## Scope

The core of the catalog database: brands, a category tree, the attributes each category
defines for its products (socket, memory size, …), and products with a price, a stock
quantity, specs checked against their category's attributes, publication, soft delete
and audit data. Shop staff manage all of it through an admin API; until sign-in exists
(TASK-7) the admin API is open. The database itself refuses rows the API would reject.
Touches: `catalog-service` (schema, migrations, admin API), `api-gateway` (admin routes
forwarded to the catalog), `shared/dto` (admin DTOs, the category DTO).

---

## User Scenarios

### US-1 — Set up a category with its attributes
A catalog manager creates "Graphics cards" under "Components" and says which
attributes its products have (chipset, memory size in GB, memory type, length in mm,
ray tracing), which are required and which values are allowed.

**Acceptance**
- Given an empty catalog, when the manager creates a category "Graphics cards" with
  attributes through the API, then it is returned with its attributes and appears in
  the category tree. *(TASK-4 AC #1)*
- Given "Components" with an attribute, when "Graphics cards" is created under it,
  then "Graphics cards" has the inherited attribute plus its own.
- Given a category that holds products, when a child category is created under it,
  then the API answers `409`: products live only in categories without children.

### US-2 — Add a product with valid specs
The manager adds an "ASUS Dual GeForce RTX 4060 8GB" to "Graphics cards", with its
brand, price, stock and specs.

**Acceptance**
- Given "Graphics cards" with its attributes and the brand "ASUS", when the manager
  creates a product whose specs satisfy the attributes, then the product is stored and
  returned with its specs, unpublished until the manager publishes it. *(TASK-4 AC #1)*
- Given that product, when the manager changes its price or stock, then the new value
  is stored and the product's update time and author change.
- Given that product, when the manager changes its slug, then the old slug stays with
  the product, so the storefront can send old links to the new address.

### US-3 — Invalid specs are refused
**Acceptance**
- Given "Graphics cards", when a product is sent with a missing required attribute, a
  value of the wrong type, a value outside the allowed set or range, or an attribute
  the category does not define, then it answers `400` with a problem body naming
  every offending attribute, and nothing is stored. *(TASK-4 AC #2)*

### US-4 — The database guards itself
**Acceptance**
- Given a row written to the database by hand, not through the API, that breaks a
  rule the API enforces (a name too long, a malformed slug, a negative price or
  stock), then the database refuses it. *(TASK-4 AC #4)*
- Given a fresh database, when the service starts, then the migrations build the
  whole schema from scratch, and the integration tests run against it. *(TASK-4 AC #3)*

### US-5 — Retire and restore
**Acceptance**
- Given a product, when the manager deletes it, then it disappears from every list and
  read, but its row stays with the deletion time, and it can be restored.
- Given a category or brand that live products still use, when the manager deletes
  it, then the API answers `409` and says how many products use it.

### Edge Cases
- Two products with the same SKU or slug → the second one answers `409`; a deleted
  product does not hold its SKU or slug.
- A slug that another entity of the same kind used before (it is in that entity's slug
  history) → `409`: an old link must keep leading to one place.
- A price or stock edit races another edit of the same product → the edit that was
  based on an older version answers `412` and changes nothing; an edit that names no
  version answers `428`.
- A category's attributes change while products already use them → a change that
  would leave any stored product with invalid specs (an attribute made required, an
  allowed value removed, a range narrowed, a type changed) answers `409` with the
  number of such products; other changes (a new optional attribute, a new allowed
  value, a new name) are stored.
- A category moved under one of its own descendants → `409`.
- An attribute code that repeats one inherited from an ancestor → `409`.
- A product moved to another category → its specs are checked against the new
  category's attributes.
- A category with child categories cannot be deleted → `409`.
- A specs value that is a number sent as a string (`"8"`) → refused, not converted.

---

## Functional Requirements

### Brands
- **FR-001** The catalog MUST store brands with a name and a unique URL slug.
- **FR-002** The admin API MUST create, read, list, update, delete and restore brands.

### Categories and attributes
- **FR-010** Categories MUST form a tree of any depth: each category has at most one
  parent and never lies under itself. Products MUST be attached only to categories
  without children.
- **FR-011** A category MUST define the attributes of its products. Each attribute has
  a code, a display name, a type, whether it is required, and the limits of its type:
  - **select** — one of a list of allowed values (socket: AM5, LGA1700);
  - **multi-select** — several of a list of allowed values (ports: HDMI, DisplayPort);
  - **number** — with an optional unit, minimum, maximum, and whether only whole
    numbers are allowed (memory 8 GB, boost clock 2.46 GHz);
  - **boolean** (ray tracing: yes / no);
  - **text** — a short free text with a maximum length (chip model).
- **FR-012** The admin API MUST create, read, list (as a tree), update, move, delete
  and restore categories, and manage their attributes.
- **FR-013** Changing a category's attributes MUST NOT leave stored products with
  invalid specs: a change any stored product would fail MUST be refused with `409`
  and the number of such products; every other change MUST be stored. The same holds
  for moving a category to another parent.
- **FR-014** The public category list (TASK-2) MUST keep working; each item also says
  which category is its parent.
- **FR-015** A category's products MUST satisfy its own attributes and those of all its
  ancestors; an attribute code MUST be unique along that path.

### Products
- **FR-020** A product MUST have a name, a unique slug, a unique SKU, a brand, a
  category, a price, a stock quantity, specs, a publication flag and a description.
- **FR-021** The price MUST be in euros, greater than zero and exact to the cent (no
  rounding errors). The shop has one currency, and the price is what a customer pays,
  VAT included (EU retail).
- **FR-022** The stock quantity MUST be a whole number, zero or more.
- **FR-023** Specs MUST be checked against the attributes of the product's category on
  every create and update; a product with invalid specs MUST NOT be stored.
- **FR-024** The admin API MUST create, read, list (filtered by category, brand and
  publication), update, publish, unpublish, delete and restore products.
- **FR-025** When the slug of a product, category or brand changes, the old slug MUST
  stay recorded with that entity and MUST NOT be given to another entity of the same
  kind; reads MUST find an entity by any of its slugs and say which one is current.
  The redirect itself is the storefront's (TASK-6).

### Common to every catalog entity
- **FR-030** Deletion MUST be soft: the row stays, marked deleted with its time, hidden
  from every read and list, and can be restored.
- **FR-031** Every row MUST record when and by whom it was created, last updated and
  deleted. Until sign-in exists (TASK-7) the author is empty.
- **FR-032** Every error MUST be an RFC 9457 problem response; validation errors list
  every offending field, specs errors every offending attribute (TASK-3 FR-041).
- **FR-033** Every entity MUST carry a version that changes on every update. Reads MUST
  return it; an update or delete MUST name the version it is based on, and MUST be
  refused with `412` when the stored version differs, or `428` when none is named.
- **FR-034** Every list of brands and products MUST be paged by a cursor that
  continues after the last item returned, not by a page number, so a page deep in a
  large list answers as fast as the first one. The category tree is returned whole.
- **FR-035** Identifiers MUST grow with creation time, so new rows land at the end of
  the indexes instead of at random places in them.

### Data integrity
- **FR-040** The database MUST enforce every rule a row can check by itself (name
  lengths, slug and SKU formats, price above zero, stock zero or more, the shape of
  specs), uniqueness among rows that are not deleted, and every reference between rows.
  Rules that read other rows (tree shape, products only in leaves, specs against the
  attributes, former slugs, attribute changes) MUST be enforced by the service inside
  one transaction, so concurrent writes cannot break them either.
- **FR-041** The schema MUST be created and changed only by versioned migrations that
  build it from scratch on an empty database and upgrade the TASK-2 database in place.
- **FR-042** The existing seed categories MUST survive the upgrade.
- **FR-043** The running service MUST reach the database with a role that can only
  read, add and change catalog rows: it cannot change the schema, delete rows
  physically, empty tables or act as a superuser. Schema changes MUST be applied by a
  separate migration step with its own credentials, which the running service does
  not have.

### Gateway
- **FR-050** The gateway MUST expose the admin API under its own prefix, forwarding to
  `catalog-service`, with the same problem responses (TASK-2 FR-011).
- **FR-051** Every admin endpoint MUST be described in OpenAPI with its DTOs, status
  codes and auth requirement, in both services (ADR 0014, TASK-3 FR-051).

### Non-functional
- **NFR-001** Creating or updating a product with specs MUST answer within 50 ms at the
  median on the local stack with 100 000 products in the catalog.

### Key Entities
- **Brand** — a maker of hardware (ASUS, AMD): name, slug.
- **Category** — a node of the product tree (Components → Graphics cards): name, slug,
  display order, parent.
- **Attribute** — a property products of a category have: code, name, type, required,
  limits (allowed values, range, unit), display order. Belongs to a category.
- **Product** — a thing the shop sells: name, slug, SKU, description, brand, category,
  price (EUR, VAT included), stock, specs (attribute code → value), published.
- **Former slug** — a slug a product, category or brand had before; belongs to that
  entity.
- Every entity carries created / updated / deleted time and author, and a version.

---

## Out of Scope
- Storefront reads: product listing, filters, facets, search, product pages — TASK-6.
- Authentication and the admin role on these endpoints — TASK-7.
- Stock reservation and its races — TASK-11.
- The admin panel UI — TASK-12.
- Product images — TASK-16.
- Generated catalog data — TASK-5.
- Product variants (one product with several colours or sizes): every variant is its
  own product.
- Price history and the EU 30-day lowest price — TASK-32; discounts, several prices
  per product.
- A change history of who changed what — TASK-30.
- Bulk import, export and price changes — TASK-31.
- `product.changed` events — TASK-8 / TASK-18.

## Explicitly Not Restated Here
- Error format, request ids, health, metrics, OpenAPI set-up — service-core (TASK-3,
  ADR 0020).
- Data access with Drizzle, hand-written SQL for hot paths — ADR 0005.
- Database per service — ADR 0003.
- Shared DTOs in `shared/dto` — ADR 0016.

## Assumptions
- The audit "by" columns stay empty until TASK-7 fills them with the signed-in user.
- A SKU is the shop's own code, unique among products that are not deleted.
- A product's description is plain text; rich text is not needed for the MVP.
- Specs values are JSON scalars (string, number, boolean) or a list of strings for
  multi-value attributes; no nested objects.
- A page of a list holds 50 items by default and 200 at most.
- VAT rates, VAT per country and prices without VAT are not needed until checkout
  (TASK-10) or later; the stored price already includes VAT.

## Clarifications

### Session 2026-11-15
- Q1: How deep is the category tree, and where may products live? → A: any depth;
  products only in categories without children; a category inherits the attributes
  of its ancestors and may add its own (FR-010, FR-015).
- Q2: Which attribute types? → A: select, multi-select, number (unit, range, whole
  numbers only), boolean, text; each attribute required or optional (FR-011).
- Q3: Which attribute changes are allowed once products exist? → A: any change that
  leaves every stored product valid; others answer `409` with the number of products
  that would break (FR-013).
- Q4: Currency? → A: one currency, euros, exact to the cent (FR-021).
- Q5: Concurrent edits? → A: detected: every entity has a version, an update names it,
  a stale one answers `412` (FR-033).
- Owner, after reviewing the plan: the running service gets a least-privilege
  database role, migrations run apart with the owner role (FR-043); deletion records
  its author too (FR-031).
- Owner, after reviewing the draft: prices include VAT (FR-021); lists paged by a
  cursor (FR-034); identifiers ordered by creation time (FR-035); old slugs kept for
  redirects (FR-025). Change history, bulk import / export and price history became
  TASK-30, TASK-31, TASK-32.

---

## Review & Acceptance Checklist
- [x] No implementation details (languages, frameworks, APIs) in requirements
- [x] Every requirement is testable and unambiguous; IDs are stable
- [x] Every US has Given / then acceptance; edge cases listed
- [x] Scope is bounded; Out of Scope names the owning task where relevant
- [x] Matches the backlog task's acceptance criteria
- [x] No speculative features or extension points (mvp-plan.md §2)
- [x] Every new / changed endpoint is listed — it gets an OpenAPI description and Swagger UI (ADR 0014)
- [x] No `[NEEDS CLARIFICATION]` markers remain
