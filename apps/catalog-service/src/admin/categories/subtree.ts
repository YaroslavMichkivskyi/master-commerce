import { ConflictException } from '@nestjs/common';
import { and, asc, gt, inArray, isNull, sql } from 'drizzle-orm';
import { product } from '../../db/schema.js';
import type { Executor } from '../common/executor.js';
import { type AttributeRule, type CategoryLevel, repeatedCodes, validateSpecs } from '../specs.js';
import { attributesOf, toRule } from './tree.js';

const BATCH = 1000;

/** The live categories at and under `rootId`, parents before children. */
async function subtreeOf(
  db: Executor,
  rootId: string,
): Promise<{ id: string; parentId: string | null; name: string }[]> {
  const result = await db.execute<{ id: string; parent_id: string | null; name: string }>(sql`
    WITH RECURSIVE down(id, parent_id, name, depth) AS (
      SELECT id, parent_id, name, 0 FROM category WHERE id = ${rootId} AND deleted_at IS NULL
      UNION ALL
      SELECT c.id, c.parent_id, c.name, down.depth + 1
      FROM category c JOIN down ON c.parent_id = down.id
      WHERE c.deleted_at IS NULL AND down.depth < 1000
    )
    SELECT id, parent_id, name FROM down ORDER BY depth`);
  return result.rows.map((r) => ({ id: r.id, parentId: r.parent_id, name: r.name }));
}

/**
 * Checks a planned change of the subtree at `rootId` before it is stored (FR-013,
 * FR-015, research R-9): the subtree will sit under `ancestorIds` (root first) and,
 * when given, `rootId` will have `newOwn` as its own attributes. `409` when a code
 * would repeat along a path, or with the number of live products whose specs would
 * become invalid; nothing is changed either way.
 */
export async function checkSubtree(
  tx: Executor,
  rootId: string,
  ancestorIds: readonly string[],
  newOwn?: readonly AttributeRule[],
): Promise<void> {
  const subtree = await subtreeOf(tx, rootId);
  const stored = await attributesOf(tx, [...ancestorIds, ...subtree.map((c) => c.id)]);
  const own = (id: string): AttributeRule[] =>
    id === rootId && newOwn ? [...newOwn] : (stored.get(id) ?? []).map(toRule);

  // The path of every category of the subtree, from the top of the tree.
  const above: CategoryLevel[] = ancestorIds.map((id) => ({ name: id, attributes: own(id) }));
  const paths = new Map<string, CategoryLevel[]>();
  for (const c of subtree) {
    const parentPath = c.id === rootId ? above : (paths.get(c.parentId!) ?? above);
    paths.set(c.id, [...parentPath, { name: c.name, attributes: own(c.id) }]);
  }

  const repeated = new Set([...paths.values()].flatMap((path) => repeatedCodes(path)));
  if (repeated.size > 0) {
    throw new ConflictException(
      `Attribute codes would repeat along a category path: ${[...repeated].sort().join(', ')}`,
    );
  }

  const invalid = await countInvalidProducts(tx, paths);
  if (invalid > 0) {
    throw new ConflictException(
      `${String(invalid)} product${invalid === 1 ? '' : 's'} would have invalid specs`,
    );
  }
}

/** Streams the live products of the categories in batches and validates each (R-9). */
async function countInvalidProducts(
  tx: Executor,
  paths: ReadonlyMap<string, CategoryLevel[]>,
): Promise<number> {
  const effective = new Map(
    [...paths].map(([id, path]) => [
      id,
      { name: path.at(-1)!.name, attributes: path.flatMap((level) => level.attributes) },
    ]),
  );
  let invalid = 0;
  let after: string | undefined;
  for (;;) {
    const rows = await tx
      .select({ id: product.id, categoryId: product.categoryId, specs: product.specs })
      .from(product)
      .where(
        and(
          inArray(product.categoryId, [...paths.keys()]),
          isNull(product.deletedAt),
          after ? gt(product.id, after) : undefined,
        ),
      )
      .orderBy(asc(product.id))
      .limit(BATCH);
    for (const row of rows) {
      const category = effective.get(row.categoryId)!;
      if (validateSpecs(category.attributes, row.specs, category.name).length > 0) invalid++;
    }
    if (rows.length < BATCH) return invalid;
    after = rows.at(-1)!.id;
  }
}
