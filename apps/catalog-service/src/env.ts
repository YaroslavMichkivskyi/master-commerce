import { fileURLToPath } from 'node:url';
import { BaseEnv, EnvInt, Secret } from '@master-commerce/service-core';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

/**
 * The shared `.env` at the repo root, resolved from this file (`src/` or `dist/`), not
 * from the working directory: the app finds it however it is started.
 */
export const ROOT_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

/** Settings of catalog-service; checked at start-up (FR-001). */
export class CatalogEnv extends BaseEnv {
  @EnvInt()
  @IsInt()
  @Min(1)
  @Max(65_535)
  CATALOG_PORT: number = 3002;

  @Secret()
  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'CATALOG_DATABASE_URL must be a postgres:// connection string',
  })
  CATALOG_DATABASE_URL!: string;
}
