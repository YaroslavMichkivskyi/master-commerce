import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, ROOT_ENV_FILE } from './config.js';

describe('ROOT_ENV_FILE', () => {
  it('points at the repo root whatever the working directory is', () => {
    expect(existsSync(join(dirname(ROOT_ENV_FILE), 'pnpm-workspace.yaml'))).toBe(true);
    expect(ROOT_ENV_FILE.endsWith('.env')).toBe(true);
  });
});

describe('loadConfig', () => {
  it('uses the defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3001,
      catalogServiceUrl: 'http://localhost:3002',
      upstreamTimeoutMs: 2000,
    });
  });

  it('reads the values that are set', () => {
    expect(
      loadConfig({
        GATEWAY_PORT: '4001',
        CATALOG_SERVICE_URL: 'https://catalog.internal:8443',
        UPSTREAM_TIMEOUT_MS: '300',
      }),
    ).toEqual({
      port: 4001,
      catalogServiceUrl: 'https://catalog.internal:8443',
      upstreamTimeoutMs: 300,
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
  ])('stops on %s=%j, naming the variable', (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrow(name);
  });
});
