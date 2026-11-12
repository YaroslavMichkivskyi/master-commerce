import { fileURLToPath } from 'node:url';

/**
 * The shared `.env` at the repo root, resolved from this file (`src/` or `dist/`), not
 * from the working directory: the app finds it however it is started.
 */
export const ROOT_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

export interface GatewayConfig {
  port: number;
  catalogServiceUrl: string;
  upstreamTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: Number(env.GATEWAY_PORT ?? 3001),
    catalogServiceUrl: env.CATALOG_SERVICE_URL ?? 'http://localhost:3002',
    upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS ?? 2000),
  };
}
