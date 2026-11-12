import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT_ENV_FILE } from './config.js';

describe('ROOT_ENV_FILE', () => {
  it('points at the repo root whatever the working directory is', () => {
    expect(existsSync(join(dirname(ROOT_ENV_FILE), 'pnpm-workspace.yaml'))).toBe(true);
    expect(ROOT_ENV_FILE.endsWith('.env')).toBe(true);
  });
});
