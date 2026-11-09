# Data model: Walking skeleton

## catalog database — table `category`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `name` | `text` | not null, 1–100 chars |
| `slug` | `text` | not null, **unique**, `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100 chars |
| `sort_order` | `integer` | not null, default 0 |
| `created_at` | `timestamptz` | not null, default `now()` |

Index: the unique index on `slug` (the seed relies on it, FR-002). Read order:
`sort_order, name`.

TASK-4 extends this table (parent, description, publication) through new migrations.
The skeleton migration is never edited after merge.

## Seed (idempotent, `ON CONFLICT (slug) DO NOTHING`)

| sort_order | name | slug |
|---|---|---|
| 10 | CPUs | `cpus` |
| 20 | Graphics cards | `graphics-cards` |
| 30 | Motherboards | `motherboards` |
| 40 | Memory | `memory` |
| 50 | Storage | `storage` |
| 60 | Laptops | `laptops` |

## Shared DTO — `@master-commerce/dto`

- `CategoryDto { id: string (uuid); name: string; slug: string; sortOrder: number }`
  has `class-validator` and `@ApiProperty` decorators. `created_at` is internal and
  never exposed.
- `CategoryListDto { items: CategoryDto[] }` — an object, not a bare array, so paging
  fields can be added later without a breaking change.
- `ProblemDto` (RFC 9457): `type`, `title`, `status`, `detail?`, `instance?`.

identity and orders databases: started empty. Their schemas come with TASK-7 and
TASK-10.
