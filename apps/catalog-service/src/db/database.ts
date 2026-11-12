import { fileURLToPath } from 'node:url';
import { Logger } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { seed } from './seed.js';

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

/** Applies pending migrations, then the idempotent seed (FR-002). */
export async function prepareDatabase(pool: pg.Pool): Promise<Database> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await seed(db);
  return db;
}
