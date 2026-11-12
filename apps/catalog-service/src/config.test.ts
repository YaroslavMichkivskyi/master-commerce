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
  const databaseUrl = 'postgres://u:p@localhost:55433/catalog';

  it('defaults the port and reads a set one', () => {
    expect(loadConfig({ CATALOG_DATABASE_URL: databaseUrl })).toEqual({ port: 3002, databaseUrl });
    expect(loadConfig({ CATALOG_DATABASE_URL: databaseUrl, CATALOG_PORT: '4002' }).port).toBe(4002);
  });

  it('stops when the database URL is missing', () => {
    expect(() => loadConfig({})).toThrow('CATALOG_DATABASE_URL');
  });

  it.each(['', 'abc', '0', '70000', '3002.5'])('stops on CATALOG_PORT=%j', (value) => {
    expect(() => loadConfig({ CATALOG_DATABASE_URL: databaseUrl, CATALOG_PORT: value })).toThrow(
      'CATALOG_PORT',
    );
  });
});
