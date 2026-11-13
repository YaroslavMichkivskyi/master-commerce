import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadEnv } from '@master-commerce/service-core';
import { describe, expect, it } from 'vitest';
import { CatalogEnv, ROOT_ENV_FILE } from './env.js';

describe('ROOT_ENV_FILE', () => {
  it('points at the repo root whatever the working directory is', () => {
    expect(existsSync(join(dirname(ROOT_ENV_FILE), 'pnpm-workspace.yaml'))).toBe(true);
    expect(ROOT_ENV_FILE.endsWith('.env')).toBe(true);
  });
});

describe('CatalogEnv', () => {
  const CATALOG_DATABASE_URL = 'postgres://u:p@localhost:55433/catalog';

  it('defaults the port and reads a set one', () => {
    expect(loadEnv(CatalogEnv, undefined, { CATALOG_DATABASE_URL }).CATALOG_PORT).toBe(3002);
    expect(
      loadEnv(CatalogEnv, undefined, { CATALOG_DATABASE_URL, CATALOG_PORT: '4002' }).CATALOG_PORT,
    ).toBe(4002);
  });

  it('stops when the database URL is missing or not postgres', () => {
    expect(() => loadEnv(CatalogEnv, undefined, {})).toThrow('CATALOG_DATABASE_URL');
    expect(() =>
      loadEnv(CatalogEnv, undefined, { CATALOG_DATABASE_URL: 'mysql://u:secret@h/db' }),
    ).toThrow(/CATALOG_DATABASE_URL[^\n]*value hidden/);
  });

  it.each(['', 'abc', '0', '70000', '3002.5'])('stops on CATALOG_PORT=%j', (value) => {
    expect(() =>
      loadEnv(CatalogEnv, undefined, { CATALOG_DATABASE_URL, CATALOG_PORT: value }),
    ).toThrow('CATALOG_PORT');
  });
});
