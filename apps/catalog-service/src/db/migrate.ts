import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool, MIGRATIONS_FOLDER } from './database.js';
import { seed } from './seed.js';

/** The role the service runs as; created by migration 0001 (FR-043). */
export const APP_ROLE = 'catalog_app';

/**
 * The `db:migrate` step, run with the owner role before the service starts (FR-043):
 * pending migrations, then the app role's password and login (a password never goes
 * into a committed migration), then the idempotent seed (TASK-2 FR-002).
 */
export async function migrateDatabase(ownerUrl: string, appPassword: string): Promise<void> {
  const pool = createPool(ownerUrl);
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    // ALTER ROLE takes no bind parameters: format() quotes the password as a literal.
    const { rows } = await pool.query<{ sql: string }>('SELECT format($1::text, $2::text) AS sql', [
      `ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD %L`,
      appPassword,
    ]);
    await pool.query(rows[0]!.sql);
    await seed(db);
  } finally {
    await pool.end();
  }
}
