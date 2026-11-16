import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { APP_ROLE, migrateDatabase } from '../../src/db/migrate.js';

export const APP_PASSWORD = 'catalog_app_test_password';

export interface CatalogDatabase {
  container: StartedPostgreSqlContainer;
  /** The owner (the container's superuser): what `db:migrate` uses. */
  ownerUrl: string;
  /** `catalog_app`: what the service uses, as in production (FR-043). */
  appUrl: string;
}

/** A fresh PostgreSQL, migrated and seeded by the `db:migrate` step. */
export async function startCatalogDatabase(): Promise<CatalogDatabase> {
  const container = await new PostgreSqlContainer('postgres:17.11-alpine').start();
  const ownerUrl = container.getConnectionUri();
  await migrateDatabase(ownerUrl, APP_PASSWORD);
  const app = new URL(ownerUrl);
  app.username = APP_ROLE;
  app.password = APP_PASSWORD;
  return { container, ownerUrl, appUrl: app.toString() };
}
