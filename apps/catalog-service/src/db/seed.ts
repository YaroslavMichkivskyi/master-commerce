import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

/** The fixed starter set; the large generated catalog comes with TASK-5. */
export const SEED_CATEGORIES = [
  { sortOrder: 10, name: 'CPUs', slug: 'cpus' },
  { sortOrder: 20, name: 'Graphics cards', slug: 'graphics-cards' },
  { sortOrder: 30, name: 'Motherboards', slug: 'motherboards' },
  { sortOrder: 40, name: 'Memory', slug: 'memory' },
  { sortOrder: 50, name: 'Storage', slug: 'storage' },
  { sortOrder: 60, name: 'Laptops', slug: 'laptops' },
];

/**
 * Idempotent: a slug any row has, live or deleted, or had before a manager changed it
 * (`former_slug`), is left alone, so a re-run never duplicates a category, brings back
 * one a manager deleted, or takes an old link from a renamed one.
 */
export async function seed(db: NodePgDatabase): Promise<void> {
  const values = sql.join(
    SEED_CATEGORIES.map((c) => sql`(${c.name}, ${c.slug}, ${c.sortOrder}::integer)`),
    sql`, `,
  );
  await db.execute(sql`
    INSERT INTO category (name, slug, sort_order)
    SELECT v.name, v.slug, v.sort_order FROM (VALUES ${values}) AS v(name, slug, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.slug = v.slug)
      AND NOT EXISTS (SELECT 1 FROM former_slug f WHERE f.kind = 'category' AND f.slug = v.slug)`);
}
