import 'reflect-metadata';
import { IsInt, IsString, Matches } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { BaseEnv, EnvInt, loadEnv, Secret } from '../src/index.js';

class TestEnv extends BaseEnv {
  @EnvInt()
  @IsInt()
  TEST_PORT: number = 0;

  @Secret()
  @IsString()
  @Matches(/^postgres:\/\//, { message: 'TEST_DATABASE_URL must be a postgres:// URL' })
  TEST_DATABASE_URL!: string;
}

describe('loadEnv (FR-001)', () => {
  it('names every bad variable at once and hides secret values', () => {
    let message = '';
    try {
      loadEnv(TestEnv, undefined, {
        LOG_LEVEL: 'loud',
        SHUTDOWN_TIMEOUT_MS: '',
        TEST_DATABASE_URL: 'mysql://root:hunter2@db/shop',
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('LOG_LEVEL');
    expect(message).toContain('got "loud"');
    expect(message).toContain('SHUTDOWN_TIMEOUT_MS');
    expect(message).toContain('TEST_DATABASE_URL must be a postgres:// URL (value hidden)');
    expect(message).not.toContain('hunter2');
  });

  it('reports a missing required variable as not set', () => {
    expect(() => loadEnv(TestEnv, undefined, {})).toThrow(/TEST_DATABASE_URL.*\(not set\)/);
  });

  it('applies defaults and converts types', () => {
    const env = loadEnv(TestEnv, undefined, {
      TEST_DATABASE_URL: 'postgres://u@h/db',
      LOG_PRETTY: 'true',
      TEST_PORT: '4005',
    });
    expect(env).toMatchObject({
      LOG_LEVEL: 'info',
      LOG_PRETTY: true,
      SHUTDOWN_TIMEOUT_MS: 8000,
      TEST_PORT: 4005,
    });
  });

  it.each(['', ' 4005', '4005.5', '-1', 'abc'])('rejects TEST_PORT=%j', (value) => {
    expect(() =>
      loadEnv(TestEnv, undefined, { TEST_DATABASE_URL: 'postgres://u@h/db', TEST_PORT: value }),
    ).toThrow('TEST_PORT');
  });

  it('reads only the variables the class declares', () => {
    const env = loadEnv(TestEnv, undefined, {
      TEST_DATABASE_URL: 'postgres://u@h/db',
      PATH: '/usr/bin',
    });
    expect(env).not.toHaveProperty('PATH');
  });
});
