import { STOREFRONT_PAGE_SIZE, type StorefrontSort } from '@master-commerce/dto';
import { type SQL, sql } from 'drizzle-orm';
import type { AttributeFilter, ListFilters, StorefrontAttribute } from './filters.js';

// The list statement of the storefront (TASK-6 research R-2, R-3, R-9a): one hand-written
// SQL statement (ADR 0005) that takes the scope once, flags each filter group per row,
// and answers the page, the total and the disjunctive facets together. Every value —
// attribute codes included — is a bound parameter; only fixed fragments of this file
// are SQL text. Arrays go in as one parameter each (`sql.param`): a plain array in a
// Drizzle template would expand into a row of parameters.

export type ListScope =
  | { kind: 'category'; categoryIds: readonly string[] }
  | { kind: 'brand'; brandId: string }
  | { kind: 'search'; tsquery: string };

export interface ListQuery {
  scope: ListScope;
  filters: ListFilters;
  /** The subtree ids of `filters.category`, resolved by the caller. */
  categoryIds?: readonly string[];
  /** The attributes to give facets for (filterable ones of the scope). */
  facetAttributes: readonly StorefrontAttribute[];
  /** Brand and search pages: a facet of the products' categories. */
  categoryFacet: boolean;
}

/** One row of the answer. */
export interface ListRow {
  total: number;
  offset: number;
  items: ListItemRow[];
  facets: FacetRow[];
}

export interface ListItemRow {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  inStock: boolean;
  brandSlug: string;
  brandName: string;
  categoryId: string;
  specs: Record<string, unknown>;
}

export interface FacetRow {
  code: string;
  value: string | null;
  label: string | null;
  count: number | null;
  min: string | number | null;
  max: string | number | null;
}

/** Fixed `ORDER BY` per sort; products out of stock always last (FR-004). */
const ORDER: Record<StorefrontSort, SQL> = {
  new: sql.raw('in_stock DESC, created_at DESC, id DESC'),
  'price-asc': sql.raw('in_stock DESC, price_cents ASC, id ASC'),
  'price-desc': sql.raw('in_stock DESC, price_cents DESC, id ASC'),
  name: sql.raw('in_stock DESC, name ASC, id ASC'),
  relevance: sql.raw('in_stock DESC, rank DESC, id ASC'),
};

const and = (parts: readonly SQL[]): SQL =>
  parts.length === 0
    ? sql`TRUE`
    : sql.join(
        parts.map((p) => sql`(${p})`),
        sql` AND `,
      );

/** The value of an attribute in `specs`, the code bound as a parameter. */
const spec = (code: string) => sql`specs ->> ${code}::text`;
const specJson = (code: string) => sql`specs -> ${code}::text`;
/** A number from `specs`, or NULL when it is not a JSON number. */
const specNumber = (code: string) =>
  sql`(CASE WHEN jsonb_typeof(${specJson(code)}) = 'number' THEN (${spec(code)})::numeric END)`;

function attributeCondition(filter: AttributeFilter): SQL {
  const { code, type } = filter.attribute;
  if (filter.kind === 'range') {
    const parts: SQL[] = [];
    if (filter.min !== undefined) parts.push(sql`${specNumber(code)} >= ${filter.min}`);
    if (filter.max !== undefined) parts.push(sql`${specNumber(code)} <= ${filter.max}`);
    return and(parts);
  }
  if (type === 'multi_select') {
    return sql`jsonb_typeof(${specJson(code)}) = 'array' AND ${specJson(code)} ?| ${sql.param(filter.values)}::text[]`;
  }
  return sql`${spec(code)} = ANY(${sql.param(filter.values)}::text[])`;
}

interface Group {
  key: string;
  condition: SQL;
}

/** The list statement for a query (one row: total, offset, items, facets). */
export function listStatement(query: ListQuery): SQL {
  const { scope, filters } = query;

  const scopeCondition =
    scope.kind === 'category'
      ? sql`p.category_id = ANY(${sql.param([...scope.categoryIds])}::uuid[])`
      : scope.kind === 'brand'
        ? sql`p.brand_id = ${scope.brandId}::uuid`
        : sql`p.search @@ to_tsquery('english', ${scope.tsquery})`;
  const rank =
    scope.kind === 'search'
      ? sql`ts_rank_cd(p.search, to_tsquery('english', ${scope.tsquery}))`
      : sql`0`;

  // The filter groups; values of one group combine with OR, groups with AND (FR-002).
  const groups: Group[] = [];
  if (filters.brands.length > 0) {
    groups.push({
      key: 'brand',
      condition: sql`brand_slug = ANY(${sql.param(filters.brands)}::text[])`,
    });
  }
  const priceParts: SQL[] = [];
  if (filters.price.min !== undefined) priceParts.push(sql`price_cents >= ${filters.price.min}`);
  if (filters.price.max !== undefined) priceParts.push(sql`price_cents <= ${filters.price.max}`);
  if (priceParts.length > 0) groups.push({ key: 'price', condition: and(priceParts) });
  if (filters.inStock) groups.push({ key: 'stock', condition: sql`in_stock` });
  if (query.categoryIds) {
    groups.push({
      key: 'category',
      condition: sql`category_id = ANY(${sql.param([...query.categoryIds])}::uuid[])`,
    });
  }
  for (const filter of filters.attributes) {
    groups.push({ key: `attr:${filter.attribute.code}`, condition: attributeCondition(filter) });
  }

  const flag = (i: number) => sql.raw(`f${i}`);
  const flags = groups.map((g, i) => sql`(${g.condition}) AS ${flag(i)}`);
  const allBut = (key?: string) =>
    and(groups.flatMap((g, i) => (g.key === key ? [] : [sql`${flag(i)}`])));

  // Facets: each group counted with every other filter applied (disjunctive, FR-003).
  const facets: SQL[] = [
    sql`SELECT 'brand'::text AS code, brand_slug AS value, max(brand_name) AS label,
          count(*)::int AS count, NULL::numeric AS min, NULL::numeric AS max
        FROM flagged WHERE ${allBut('brand')} GROUP BY brand_slug`,
    sql`SELECT 'price'::text, NULL, NULL, NULL::int, min(price_cents)::numeric, max(price_cents)::numeric
        FROM flagged WHERE ${allBut('price')}`,
  ];
  if (query.categoryFacet) {
    facets.push(sql`SELECT 'category'::text, c.slug, max(c.name), count(*)::int, NULL::numeric, NULL::numeric
        FROM flagged f JOIN category c ON c.id = f.category_id
        WHERE ${allBut('category')} GROUP BY c.slug`);
  }
  for (const attribute of query.facetAttributes) {
    const key = `attr:${attribute.code}`;
    const code = attribute.code;
    if (attribute.type === 'number') {
      facets.push(sql`SELECT ${code}::text, NULL, NULL, NULL::int, min(${specNumber(code)}), max(${specNumber(code)})
          FROM flagged WHERE ${allBut(key)}`);
    } else if (attribute.type === 'multi_select') {
      facets.push(sql`SELECT ${code}::text, v.value, NULL, count(*)::int, NULL::numeric, NULL::numeric
          FROM flagged,
            jsonb_array_elements_text(CASE WHEN jsonb_typeof(${specJson(code)}) = 'array'
                                           THEN ${specJson(code)} ELSE '[]'::jsonb END) AS v(value)
          WHERE ${allBut(key)} GROUP BY v.value`);
    } else {
      facets.push(sql`SELECT ${code}::text, ${spec(code)}, NULL, count(*)::int, NULL::numeric, NULL::numeric
          FROM flagged WHERE ${allBut(key)} AND ${spec(code)} IS NOT NULL GROUP BY 2`);
    }
  }

  const order = ORDER[filters.sort];
  const offset = (filters.page - 1) * STOREFRONT_PAGE_SIZE;

  return sql`
    WITH scope AS MATERIALIZED (
      SELECT p.id, p.name, p.slug, p.price_cents, (p.stock > 0) AS in_stock, p.specs,
             p.category_id, p.created_at, b.slug AS brand_slug, b.name AS brand_name,
             ${rank} AS rank
      FROM product p
      JOIN brand b ON b.id = p.brand_id AND b.deleted_at IS NULL
      JOIN category c ON c.id = p.category_id AND c.deleted_at IS NULL
      WHERE p.deleted_at IS NULL AND p.published AND ${scopeCondition}
    ),
    flagged AS MATERIALIZED (
      SELECT s.*${flags.length > 0 ? sql`, ${sql.join(flags, sql`, `)}` : sql``} FROM scope s
    ),
    matched AS (SELECT * FROM flagged WHERE ${allBut()}),
    counted AS (SELECT count(*)::int AS total FROM matched),
    paging AS (
      SELECT LEAST(${offset}::int, (GREATEST(total - 1, 0) / ${STOREFRONT_PAGE_SIZE}) * ${STOREFRONT_PAGE_SIZE}) AS off
      FROM counted
    ),
    page AS (
      SELECT m.*, row_number() OVER (ORDER BY ${order}) AS rn
      FROM matched m
      ORDER BY ${order}
      LIMIT ${STOREFRONT_PAGE_SIZE} OFFSET (SELECT off FROM paging)
    )
    SELECT
      (SELECT total FROM counted) AS total,
      (SELECT off FROM paging) AS "offset",
      coalesce((
        SELECT json_agg(json_build_object(
          'id', id, 'name', name, 'slug', slug, 'priceCents', price_cents, 'inStock', in_stock,
          'brandSlug', brand_slug, 'brandName', brand_name, 'categoryId', category_id,
          'specs', specs) ORDER BY rn)
        FROM page), '[]'::json) AS items,
      coalesce((SELECT json_agg(f) FROM (${sql.join(facets, sql` UNION ALL `)}) AS f), '[]'::json) AS facets`;
}
