import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadEnv } from '@master-commerce/service-core';
import { describe, expect, it } from 'vitest';
import { GatewayEnv, ROOT_ENV_FILE } from './env.js';

describe('ROOT_ENV_FILE', () => {
  it('points at the repo root whatever the working directory is', () => {
    expect(existsSync(join(dirname(ROOT_ENV_FILE), 'pnpm-workspace.yaml'))).toBe(true);
    expect(ROOT_ENV_FILE.endsWith('.env')).toBe(true);
  });
});

describe('GatewayEnv', () => {
  it('uses the defaults when nothing is set', () => {
    expect(loadEnv(GatewayEnv, undefined, {})).toMatchObject({
      GATEWAY_PORT: 3001,
      CATALOG_SERVICE_URL: 'http://localhost:3002',
      UPSTREAM_TIMEOUT_MS: 2000,
    });
  });

  it('reads the values that are set', () => {
    expect(
      loadEnv(GatewayEnv, undefined, {
        GATEWAY_PORT: '4001',
        CATALOG_SERVICE_URL: 'https://catalog.internal:8443',
        UPSTREAM_TIMEOUT_MS: '300',
      }),
    ).toMatchObject({
      GATEWAY_PORT: 4001,
      CATALOG_SERVICE_URL: 'https://catalog.internal:8443',
      UPSTREAM_TIMEOUT_MS: 300,
    });
  });

  it.each([
    ['UPSTREAM_TIMEOUT_MS', ''],
    ['UPSTREAM_TIMEOUT_MS', 'abc'],
    ['UPSTREAM_TIMEOUT_MS', '0'],
    ['UPSTREAM_TIMEOUT_MS', '1.5'],
    ['GATEWAY_PORT', ''],
    ['GATEWAY_PORT', '70000'],
    ['GATEWAY_PORT', ' 3001'],
    ['CATALOG_SERVICE_URL', 'localhost:3002'],
    ['CATALOG_SERVICE_URL', 'not a url'],
    ['CATALOG_SERVICE_URL', 'ftp://catalog:3002'],
  ])('stops on %s=%j, naming the variable', (name, value) => {
    expect(() => loadEnv(GatewayEnv, undefined, { [name]: value })).toThrow(name);
  });

  it.each([
    'http://catalog_service:3002',
    'http://catalog-service:3002',
    'http://10.0.0.5:3002',
    'https://catalog.internal',
  ])('accepts the catalog address %j', (url) => {
    expect(loadEnv(GatewayEnv, undefined, { CATALOG_SERVICE_URL: url }).CATALOG_SERVICE_URL).toBe(
      url,
    );
  });
});
