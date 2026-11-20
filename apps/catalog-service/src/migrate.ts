import 'reflect-metadata';
import { InvalidConfigError, loadEnv } from '@master-commerce/service-core';
import { migrateDatabase } from './db/migrate.js';
import { MigrateEnv, ROOT_ENV_FILE } from './env.js';

// `pnpm --filter catalog-service db:migrate`: the schema step before the service starts (FR-043).
try {
  const env = loadEnv(MigrateEnv, ROOT_ENV_FILE);
  await migrateDatabase(env.CATALOG_MIGRATION_URL, env.CATALOG_APP_PASSWORD);
  console.log('catalog database migrated');
} catch (error) {
  console.error(error instanceof InvalidConfigError ? error.message : error);
  process.exit(1);
}
