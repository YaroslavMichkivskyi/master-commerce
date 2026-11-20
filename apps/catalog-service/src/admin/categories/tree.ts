import type { AttributeDto } from '@master-commerce/dto';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  category,
  categoryAttribute,
  type CategoryAttributeRow,
  type CategoryRow,
  product,
} from '../../db/schema.js';
import type { Executor } from '../common/executor.js';
import type { AttributeRule } from '../specs.js';

// Reads and locks of the category tree (research R-5), shared by the category and
// product admin services.

/** Live categories only, everywhere below. */
export const liveCategory = isNull(category.deletedAt);

/**
 * Serialises the changes of the tree's shape (moves). Row locks along two paths would
 * deadlock when two moves cross (A under B, B under A); moves are rare admin actions.
 */
export async function lockTreeShape(tx: Executor): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('category-tree'))`);
}

/**
 * A live category, locked for the transaction: `update` while children or products are
 * added under it, so a concurrent delete or a product write waits (R-5).
 */
export async function lockLiveCategory(
  tx: Executor,
  id: string,
  mode: 'update' | 'share',
): Promise<CategoryRow | undefined> {
  const [row] = await tx
    .select()
    .from(category)
    .where(and(eq(category.id, id), liveCategory))
    .for(mode);
  return row;
}

/** The ids from the root down to `id`, `id` included; empty when it does not exist. */
export async function pathTo(db: Executor, id: string): Promise<string[]> {
  // The depth bound only guards against a cycle written into the table by hand.
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE up(id, parent_id, depth) AS (
      SELECT id, parent_id, 0 FROM category WHERE id = ${id}
      UNION ALL
      SELECT c.id, c.parent_id, up.depth + 1
      FROM category c JOIN up ON c.id = up.parent_id
      WHERE up.depth < 1000
    )
    SELECT id FROM up ORDER BY depth DESC`);
  return result.rows.map((r) => r.id);
}

/** Live attributes of the given categories, grouped by category, in display order. */
export async function attributesOf(
  db: Executor,
  categoryIds: readonly string[],
): Promise<Map<string, CategoryAttributeRow[]>> {
  const grouped = new Map<string, CategoryAttributeRow[]>(categoryIds.map((id) => [id, []]));
  if (categoryIds.length === 0) return grouped;
  const rows = await db
    .select()
    .from(categoryAttribute)
    .where(
      and(
        inArray(categoryAttribute.categoryId, [...categoryIds]),
        isNull(categoryAttribute.deletedAt),
      ),
    )
    .orderBy(asc(categoryAttribute.sortOrder), asc(categoryAttribute.code));
  for (const row of rows) grouped.get(row.categoryId)?.push(row);
  return grouped;
}

export async function liveChildCount(db: Executor, id: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(category)
    .where(and(eq(category.parentId, id), liveCategory));
  return row?.n ?? 0;
}

export async function liveProductCount(db: Executor, categoryId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(product)
    .where(and(eq(product.categoryId, categoryId), isNull(product.deletedAt)));
  return row?.n ?? 0;
}

/** `numeric` arrives as a string; the rules work with numbers. */
export function toRule(row: CategoryAttributeRow): AttributeRule {
  return {
    code: row.code,
    type: row.type,
    required: row.required,
    sortOrder: row.sortOrder,
    allowedValues: row.allowedValues,
    minValue: row.minValue === null ? null : Number(row.minValue),
    maxValue: row.maxValue === null ? null : Number(row.maxValue),
    wholeNumbers: row.wholeNumbers,
    maxLength: row.maxLength,
  };
}

/** Only the limits its type has. */
export function toAttributeDto(row: CategoryAttributeRow): AttributeDto {
  const dto: AttributeDto = {
    code: row.code,
    name: row.name,
    type: row.type,
    required: row.required,
    sortOrder: row.sortOrder,
  };
  if (row.allowedValues !== null) dto.allowedValues = row.allowedValues;
  if (row.type === 'number') {
    if (row.unit !== null) dto.unit = row.unit;
    if (row.minValue !== null) dto.minValue = Number(row.minValue);
    if (row.maxValue !== null) dto.maxValue = Number(row.maxValue);
    dto.wholeNumbers = row.wholeNumbers;
  }
  if (row.maxLength !== null) dto.maxLength = row.maxLength;
  return dto;
}
