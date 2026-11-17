import { ConflictException } from '@nestjs/common';
import type { Database } from '../../db/database.js';

/** The database, or a transaction of it: what the admin helpers run their SQL on. */
export type Executor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/** The PostgreSQL error code of an error, also when Drizzle wraps the driver's error. */
export function pgErrorCode(error: unknown): string | undefined {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Runs `write`; a unique violation (two live rows with one slug or SKU) becomes `409`. */
export async function conflictOnUnique<T>(write: () => Promise<T>, message: string): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (pgErrorCode(error) === '23505') throw new ConflictException(message, { cause: error });
    throw error;
  }
}
