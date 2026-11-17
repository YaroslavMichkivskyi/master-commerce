import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Tables and the rules the database holds by itself (FR-040, data-model.md). Rules that
// read other rows live in the service (research R-7).

const SLUG = `'^[a-z0-9]+(-[a-z0-9]+)*$'`;
const live = sql`deleted_at IS NULL`;

/** UUIDv7 made by the database (FR-035, research R-1). */
const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuid_v7()`);

/** Audit, soft delete and version columns of every entity (FR-030, FR-031, FR-033). */
const common = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
  version: integer('version').notNull().default(1),
});

/** CHECKs every entity table has. */
const commonChecks = (table: string) => [
  check(`${table}_version_positive`, sql`version > 0`),
  check(`${table}_deleted_by_needs_deleted_at`, sql`deleted_at IS NOT NULL OR deleted_by IS NULL`),
];

const nameChecks = (table: string, max: number) => [
  check(`${table}_name_length`, sql.raw(`char_length(name) BETWEEN 1 AND ${max}`)),
  check(`${table}_name_trimmed`, sql`name = btrim(name)`),
];

const slugCheck = (table: string, column = 'slug') =>
  check(
    `${table}_${column}_format`,
    sql.raw(`${column} ~ ${SLUG} AND char_length(${column}) <= 100`),
  );

export const brand = pgTable(
  'brand',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...common(),
  },
  () => [
    uniqueIndex('brand_slug_live')
      .on(sql`slug`)
      .where(live),
    ...nameChecks('brand', 100),
    slugCheck('brand'),
    ...commonChecks('brand'),
  ],
);

export const category = pgTable(
  'category',
  {
    // TASK-2 rows keep their v4 ids; new rows get v7.
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    parentId: uuid('parent_id'),
    ...common(),
  },
  (t) => [
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'category_parent_fk' }),
    uniqueIndex('category_slug_live').on(t.slug).where(live),
    index('category_parent_live').on(t.parentId).where(live),
    check('category_not_own_parent', sql`parent_id <> id`),
    ...nameChecks('category', 100),
    slugCheck('category'),
    ...commonChecks('category'),
  ],
);

export const ATTRIBUTE_TYPES = ['select', 'multi_select', 'number', 'boolean', 'text'] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export const categoryAttribute = pgTable(
  'category_attribute',
  {
    id: id(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').$type<AttributeType>().notNull(),
    required: boolean('required').notNull(),
    allowedValues: text('allowed_values').array(),
    unit: text('unit'),
    minValue: numeric('min_value'),
    maxValue: numeric('max_value'),
    wholeNumbers: boolean('whole_numbers').notNull().default(false),
    maxLength: integer('max_length'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...common(),
  },
  (t) => [
    uniqueIndex('category_attribute_code_live').on(t.categoryId, t.code).where(live),
    check(
      'category_attribute_code_format',
      sql`code ~ '^[a-z][a-z0-9_]*$' AND char_length(code) <= 50`,
    ),
    check(
      'category_attribute_type',
      sql.raw(`type IN (${ATTRIBUTE_TYPES.map((x) => `'${x}'`).join(', ')})`),
    ),
    // A list type has a non-empty list of values; other types have none.
    check(
      'category_attribute_values_for_lists',
      sql`(type IN ('select', 'multi_select')) = (allowed_values IS NOT NULL AND cardinality(allowed_values) > 0)`,
    ),
    // Unit, range and "whole numbers" belong to numbers only.
    check(
      'category_attribute_number_limits',
      sql`type = 'number' OR (unit IS NULL AND min_value IS NULL AND max_value IS NULL AND NOT whole_numbers)`,
    ),
    check(
      'category_attribute_range',
      sql`min_value IS NULL OR max_value IS NULL OR min_value <= max_value`,
    ),
    check(
      'category_attribute_unit_length',
      sql`unit IS NULL OR char_length(unit) BETWEEN 1 AND 20`,
    ),
    // A text has a maximum length, 1–500; other types have none.
    check(
      'category_attribute_text_length',
      sql`(type = 'text') = (max_length IS NOT NULL) AND (max_length IS NULL OR max_length BETWEEN 1 AND 500)`,
    ),
    ...nameChecks('category_attribute', 100),
    ...commonChecks('category_attribute'),
  ],
);

export const product = pgTable(
  'product',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    sku: text('sku').notNull(),
    description: text('description').notNull().default(''),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brand.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id),
    priceCents: integer('price_cents').notNull(),
    stock: integer('stock').notNull().default(0),
    specs: jsonb('specs').$type<Record<string, unknown>>().notNull().default({}),
    published: boolean('published').notNull().default(false),
    ...common(),
  },
  (t) => [
    uniqueIndex('product_slug_live').on(t.slug).where(live),
    uniqueIndex('product_sku_live').on(t.sku).where(live),
    // Cursor paging by id within the admin filters (research R-6).
    index('product_category_live').on(t.categoryId, t.id).where(live),
    index('product_brand_live').on(t.brandId, t.id).where(live),
    index('product_published_live').on(t.published, t.id).where(live),
    check('product_sku_format', sql`sku ~ '^[A-Z0-9][A-Z0-9-]*$' AND char_length(sku) <= 40`),
    check('product_price_positive', sql`price_cents > 0`),
    check('product_stock_not_negative', sql`stock >= 0`),
    check('product_specs_object', sql`jsonb_typeof(specs) = 'object'`),
    check('product_description_length', sql`char_length(description) <= 10000`),
    ...nameChecks('product', 200),
    slugCheck('product'),
    ...commonChecks('product'),
  ],
);

export const SLUG_KINDS = ['brand', 'category', 'product'] as const;
export type SlugKind = (typeof SLUG_KINDS)[number];

/** Slugs an entity had before; old links keep finding it (FR-025, research R-10). */
export const formerSlug = pgTable(
  'former_slug',
  {
    kind: text('kind').$type<SlugKind>().notNull(),
    slug: text('slug').notNull(),
    entityId: uuid('entity_id').notNull(),
    retiredAt: timestamp('retired_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'former_slug_pk', columns: [t.kind, t.slug] }),
    index('former_slug_entity').on(t.kind, t.entityId),
    check('former_slug_kind', sql.raw(`kind IN (${SLUG_KINDS.map((x) => `'${x}'`).join(', ')})`)),
    slugCheck('former_slug'),
  ],
);

export type BrandRow = typeof brand.$inferSelect;
export type CategoryRow = typeof category.$inferSelect;
export type CategoryAttributeRow = typeof categoryAttribute.$inferSelect;
export type ProductRow = typeof product.$inferSelect;
