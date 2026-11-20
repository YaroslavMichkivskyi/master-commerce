import { fileURLToPath } from 'node:url';
import { Logger } from '@nestjs/common';
import { InvalidConfigError } from '@master-commerce/service-core';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

export type Database = NodePgDatabase;

/** `drizzle/` sits next to `src/` and `dist/`, so the same path works for both. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

const logger = new Logger('Database');

/** A database that does not answer fails fast instead of hanging requests and /health. */
export const CONNECTION_TIMEOUT_MS = 2000;

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  // An idle connection dropped by the server (restart, failover) emits 'error' on the pool;
  // unhandled, it would crash the process. The pool replaces the connection on next use.
  pool.on('error', (error) => logger.warn(`Idle database connection lost: ${error.message}`));
  return pool;
}

/**
 * The service's connection (FR-043). Migrations are not applied here: the `db:migrate`
 * step does that with the owner role. A role that could change the schema is refused,
 * so an old `.env` pointing at the owner does not quietly run the service with it.
 */
export async function connectDatabase(pool: pg.Pool): Promise<Database> {
  const { rows } = await pool.query<{ super: boolean; owns: boolean }>(
    `SELECT r.rolsuper AS super,
            EXISTS (SELECT 1 FROM pg_tables
                    WHERE schemaname = 'public' AND tableowner = current_user) AS owns
     FROM pg_roles r WHERE r.rolname = current_user`,
  );
  if (rows[0]?.super || rows[0]?.owns) {
    throw new InvalidConfigError(
      'Invalid configuration, the service cannot start:\n' +
        '  CATALOG_DATABASE_URL: connects as a superuser or the owner of the schema; ' +
        'the service runs as catalog_app (see .env.example), migrations use ' +
        'CATALOG_MIGRATION_URL',
    );
  }
  return drizzle(pool);
}
