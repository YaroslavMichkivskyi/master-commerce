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
  return { port: Number(env.CATALOG_PORT ?? 3002), databaseUrl };
}
