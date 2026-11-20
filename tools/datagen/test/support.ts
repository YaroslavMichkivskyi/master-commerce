import { TREE } from '../src/catalog/tree.js';
import type { AttributeDef, CategoryDef } from '../src/catalog/types.js';

export interface Node {
  def: CategoryDef;
  /** The attributes along the path, root first. */
  path: AttributeDef[];
  depth: number;
}

/** Every category of the tree, parents before children. */
export const nodes: Node[] = [];
(function walk(defs: readonly CategoryDef[], path: AttributeDef[], depth: number) {
  for (const def of defs) {
    const own = [...path, ...def.attributes];
    nodes.push({ def, path: own, depth });
    if (def.children) walk(def.children, own, depth + 1);
  }
})(TREE, [], 1);

export const leaves = nodes.filter((n) => n.def.leaf);

/**
 * Whether a spec value passes the catalog's rules for the attribute — a copy of
 * catalog-service's `validateSpecs` per value, for the generator's own tests; the
 * catalog-service test checks generated data with the original (spec FR-008).
 */
export function allowed(a: AttributeDef, value: unknown): boolean {
  switch (a.type) {
    case 'select':
      return typeof value === 'string' && (a.values ?? []).includes(value);
    case 'multi_select':
      return (
        Array.isArray(value) &&
        value.every((v) => (a.values ?? []).includes(v as string)) &&
        new Set(value).size === value.length &&
        (!a.required || value.length > 0)
      );
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        (!a.whole || Number.isInteger(value)) &&
        (a.min === undefined || value >= a.min) &&
        (a.max === undefined || value <= a.max)
      );
    case 'boolean':
      return typeof value === 'boolean';
    case 'text':
      return typeof value === 'string' && value.trim() !== '' && value.length <= (a.maxLength ?? 0);
  }
}
