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

/**
 * Read once at start-up; a bad value stops the app with its name. Unchecked, an empty or
 * mistyped value would surface later as every request answering "catalog unavailable".
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: integer(env, 'GATEWAY_PORT', 3001, 1, 65_535),
    catalogServiceUrl: httpUrl(env, 'CATALOG_SERVICE_URL', 'http://localhost:3002'),
    upstreamTimeoutMs: integer(env, 'UPSTREAM_TIMEOUT_MS', 2000, 1, 600_000),
  };
}

function integer(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}, got "${raw}"`);
  }
  return value;
}

function httpUrl(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const raw = env[name] ?? fallback;
  if (!URL.canParse(raw) || !/^https?:$/.test(new URL(raw).protocol)) {
    throw new Error(`${name} must be an http(s) URL, got "${raw}"`);
  }
  return raw;
}
