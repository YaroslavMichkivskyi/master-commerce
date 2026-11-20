import { ConflictException } from '@nestjs/common';
import type { Database } from '../../db/database.js';

/** The database, or a transaction of it: what the admin helpers run their SQL on. */
export type Executor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/** The driver's error inside an error, also when Drizzle wraps it. */
function driverError(error: unknown): { code: string; constraint?: unknown } | undefined {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const fields = e as Error & { code?: unknown; constraint?: unknown };
    if (typeof fields.code === 'string')
      return { code: fields.code, constraint: fields.constraint };
  }
  return undefined;
}

/** The PostgreSQL error code of an error, also when Drizzle wraps the driver's error. */
export function pgErrorCode(error: unknown): string | undefined {
  return driverError(error)?.code;
}

/**
 * Runs `write`; a unique violation (two live rows with one slug or SKU) becomes `409`.
 * `message` may depend on the violated index, for a table with more than one.
 */
export async function conflictOnUnique<T>(
  write: () => Promise<T>,
  message: string | ((constraint: string | undefined) => string),
): Promise<T> {
  try {
    return await write();
  } catch (error) {
    const pg = driverError(error);
    if (pg?.code !== '23505') throw error;
    const constraint = typeof pg.constraint === 'string' ? pg.constraint : undefined;
    throw new ConflictException(typeof message === 'string' ? message : message(constraint), {
      cause: error,
    });
  }
}
