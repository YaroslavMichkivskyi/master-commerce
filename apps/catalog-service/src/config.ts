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
