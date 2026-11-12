import { fileURLToPath } from 'node:url';

/**
 * The shared `.env` at the repo root, resolved from this file (`src/` or `dist/`), not
 * from the working directory: the app finds it however it is started.
 */
export const ROOT_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

export interface CatalogConfig {
  port: number;
  databaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CatalogConfig {
  const databaseUrl = env.CATALOG_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('CATALOG_DATABASE_URL is not set (see .env.example)');
  }
  return { port: port(env.CATALOG_PORT), databaseUrl };
}

/** Unset → 3002; anything but an integer port stops the app with the variable's name. */
function port(raw: string | undefined): number {
  if (raw === undefined) return 3002;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || value < 1 || value > 65_535) {
    throw new Error(`CATALOG_PORT must be an integer from 1 to 65535, got "${raw}"`);
  }
  return value;
}
