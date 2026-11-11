import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { category } from './schema.js';

/** The fixed starter set; the large generated catalog comes with TASK-5. */
export const SEED_CATEGORIES = [
  { sortOrder: 10, name: 'CPUs', slug: 'cpus' },
  { sortOrder: 20, name: 'Graphics cards', slug: 'graphics-cards' },
  { sortOrder: 30, name: 'Motherboards', slug: 'motherboards' },
  { sortOrder: 40, name: 'Memory', slug: 'memory' },
  { sortOrder: 50, name: 'Storage', slug: 'storage' },
  { sortOrder: 60, name: 'Laptops', slug: 'laptops' },
];

/** Idempotent: existing slugs are left untouched, so restarts never duplicate rows. */
export async function seed(db: NodePgDatabase): Promise<void> {
  await db.insert(category).values(SEED_CATEGORIES).onConflictDoNothing({ target: category.slug });
}
