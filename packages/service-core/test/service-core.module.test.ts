import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { IsInt } from 'class-validator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BaseEnv, createServiceApp, ENV, EnvInt, ServiceCoreModule } from '../src/index.js';

let created = 0;
/** Counts how many env objects are built. */
class CountingEnv extends BaseEnv {
  @EnvInt()
  @IsInt()
  TEST_PORT: number = 0;

  constructor() {
    super();
    created++;
  }
}

@Injectable()
class UsesEnv {
  constructor(readonly env: CountingEnv) {}
}

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      service: 'test-service',
      version: '1.2.3',
      description: 'A service for the module tests',
      env: CountingEnv,
      portVariable: 'TEST_PORT',
      logDestination: { write: () => undefined },
    }),
  ],
  providers: [UsesEnv],
})
class TestAppModule {}

describe('ServiceCoreModule env (FR-001)', () => {
  let app: Awaited<ReturnType<typeof createServiceApp>>;
  const logLevel = process.env.LOG_LEVEL;

  beforeAll(async () => {
    process.env.LOG_LEVEL = 'warn';
    app = await createServiceApp(TestAppModule);
  });

  afterAll(async () => {
    if (logLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = logLevel;
    await app?.close();
  });

  it('reads and checks the environment once', () => {
    expect(created).toBe(1);
  });

  it('has one env object, the one the service gets', () => {
    expect(app.get(UsesEnv).env).toBe(app.get(ENV));
    expect(app.get(ENV)).toMatchObject({ LOG_LEVEL: 'warn' });
  });
});
