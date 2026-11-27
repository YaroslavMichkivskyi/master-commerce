import { and, asc, isNull } from 'drizzle-orm';
import type { Executor } from '../admin/common/executor.js';
import { category, categoryAttribute, type CategoryAttributeRow } from '../db/schema.js';
import type { StorefrontAttribute } from './filters.js';

// The live category tree with its attributes, read once per request: hundreds of rows,
// two small queries, and every storefront answer needs paths, subtrees or attributes.

export interface SnapshotCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  parentId: string | null;
  updatedAt: Date;
  /** Own attributes, in display order. */
  attributes: StorefrontAttribute[];
}

export interface CatalogSnapshot {
  byId: ReadonlyMap<string, SnapshotCategory>;
  bySlug: ReadonlyMap<string, SnapshotCategory>;
  /** Children per parent id (`null` for the top level), in display order. */
  children: ReadonlyMap<string | null, readonly SnapshotCategory[]>;
}

const toAttribute = (row: CategoryAttributeRow): StorefrontAttribute => ({
  code: row.code,
  name: row.name,
  type: row.type,
  unit: row.unit,
  allowedValues: row.allowedValues,
});

export async function loadSnapshot(db: Executor): Promise<CatalogSnapshot> {
  const [categories, attributes] = await Promise.all([
    db
      .select()
      .from(category)
      .where(isNull(category.deletedAt))
      .orderBy(asc(category.sortOrder), asc(category.name)),
    db
      .select()
      .from(categoryAttribute)
      .where(and(isNull(categoryAttribute.deletedAt)))
      .orderBy(asc(categoryAttribute.sortOrder), asc(categoryAttribute.code)),
  ]);
  const byId = new Map<string, SnapshotCategory>(
    categories.map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        parentId: c.parentId,
        updatedAt: c.updatedAt,
        attributes: [],
      },
    ]),
  );
  for (const a of attributes) byId.get(a.categoryId)?.attributes.push(toAttribute(a));
  const children = new Map<string | null, SnapshotCategory[]>();
  for (const c of byId.values()) {
    const key = c.parentId !== null && byId.has(c.parentId) ? c.parentId : null;
    children.set(key, [...(children.get(key) ?? []), c]);
  }
  return { byId, bySlug: new Map([...byId.values()].map((c) => [c.slug, c])), children };
}

/** Ancestors of a category, root first, without the category itself. */
export function ancestorsOf(snapshot: CatalogSnapshot, id: string): SnapshotCategory[] {
  const path: SnapshotCategory[] = [];
  let current = snapshot.byId.get(id);
  for (let guard = 0; current?.parentId && guard < 1000; guard++) {
    const parent = snapshot.byId.get(current.parentId);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }
  return path;
}

/** The category and every live category below it. */
export function subtreeOf(snapshot: CatalogSnapshot, id: string): string[] {
  const ids: string[] = [];
  const stack = [id];
  while (stack.length > 0 && ids.length < 100_000) {
    const next = stack.pop()!;
    ids.push(next);
    for (const child of snapshot.children.get(next) ?? []) stack.push(child.id);
  }
  return ids;
}

/** The effective attributes of a category: the ancestors' first, then its own (TASK-4 FR-015). */
export function effectiveAttributes(snapshot: CatalogSnapshot, id: string): StorefrontAttribute[] {
  const own = snapshot.byId.get(id);
  return [...ancestorsOf(snapshot, id), ...(own ? [own] : [])].flatMap((c) => c.attributes);
}
