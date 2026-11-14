import { fileURLToPath } from 'node:url';
import { BaseEnv, EnvInt } from '@master-commerce/service-core';
import { IsInt, IsUrl, Max, Min } from 'class-validator';

/**
 * The shared `.env` at the repo root, resolved from this file (`src/` or `dist/`), not
 * from the working directory: the app finds it however it is started.
 */
export const ROOT_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

/**
 * Settings of api-gateway; checked at start-up (FR-001). Unchecked, a mistyped value
 * would surface later as every request answering "catalog unavailable".
 */
export class GatewayEnv extends BaseEnv {
  @EnvInt()
  @IsInt()
  @Min(1)
  @Max(65_535)
  GATEWAY_PORT: number = 3001;

  @IsUrl(
    // Container names may have underscores (`catalog_service`); `URL` accepts them too.
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
      allow_underscores: true,
    },
    { message: 'CATALOG_SERVICE_URL must be an http(s) URL' },
  )
  CATALOG_SERVICE_URL: string = 'http://localhost:3002';

  @EnvInt()
  @IsInt()
  @Min(1)
  @Max(600_000)
  UPSTREAM_TIMEOUT_MS: number = 2000;
}
