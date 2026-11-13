import 'reflect-metadata';
import { type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import {
  Controller,
  Get,
  type INestApplication,
  Injectable,
  type LoggerService,
  Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  HealthController,
  Lifecycle,
  Public,
  READINESS_CHECKS,
  type ReadinessCheck,
  shutDown,
} from '../src/index.js';

/** A dependency the tests switch on and off. */
@Injectable()
class FakeDatabase implements ReadinessCheck {
  static up = true;
  readonly name = 'database';
  check(): Promise<void> {
    return FakeDatabase.up
      ? Promise.resolve()
      : Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432 user=shop'));
  }
}

let release: (() => void) | undefined;
/** Finishes the request that `GET /wait` holds open. */
const releaseWaiting = (): void => release?.();

@Controller('wait')
@Public()
class WaitController {
  /** Answers only when a test calls `release()`. */
  @Get()
  async wait(): Promise<{ done: true }> {
    await new Promise<void>((resolve) => (release = resolve));
    return { done: true };
  }
}

// What the service-core module will wire up (a later step), assembled by hand here.
@Module({
  imports: [TerminusModule],
  controllers: [HealthController, WaitController],
  providers: [
    Lifecycle,
    FakeDatabase,
    {
      provide: READINESS_CHECKS,
      inject: [FakeDatabase],
      useFactory: (...checks: ReadinessCheck[]) => checks,
    },
  ],
})
class TestModule {}

class MemoryLogger implements LoggerService {
  lines: string[] = [];
  log = (m: unknown) => void this.lines.push(String(m));
  error = (m: unknown) => void this.lines.push(String(m));
  warn = (m: unknown) => void this.lines.push(String(m));
}

describe('health endpoints (FR-020, FR-021)', () => {
  const logger = new MemoryLogger();
  let app: INestApplication;
  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger });
    await app.init();
  });

  afterEach(() => {
    FakeDatabase.up = true;
    app.get(Lifecycle).shuttingDown = false;
  });

  afterAll(() => app?.close());

  it('liveness answers 200 even when a dependency is down', async () => {
    FakeDatabase.up = false;
    const res = await http().get('/health/live').expect(200);
    expect(res.body).toEqual({ status: 'ok', info: {}, error: {}, details: {} });
  });

  it('readiness answers 200 with every check up', async () => {
    const res = await http().get('/health/ready').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      info: { database: { status: 'up' }, lifecycle: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' }, lifecycle: { status: 'up' } },
    });
  });

  it('readiness answers 503 when a dependency is down, the cause only in the log', async () => {
    FakeDatabase.up = false;
    const res = await http().get('/health/ready').expect(503);
    expect(res.body).toMatchObject({
      status: 'error',
      error: { database: { status: 'down', message: 'database unreachable' } },
    });
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
    expect(logger.lines.some((l) => l.includes('ECONNREFUSED 10.0.0.5'))).toBe(true);
  });

  it('readiness answers 503 while the service is shutting down', async () => {
    app.get(Lifecycle).shuttingDown = true;
    const res = await http().get('/health/ready').expect(503);
    expect(res.body).toMatchObject({
      error: { lifecycle: { status: 'down', message: 'shutting down' } },
    });
  });
});

describe('shutDown (FR-060)', () => {
  async function started(): Promise<{ app: INestApplication; url: string }> {
    const app = await NestFactory.create(TestModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const { port } = (app.getHttpServer() as Server).address() as AddressInfo;
    return { app, url: `http://127.0.0.1:${port}` };
  }

  it('lets an in-flight request finish, refuses new ones, then exits with 0', async () => {
    const { app, url } = await started();
    release = undefined;
    const inFlight = fetch(`${url}/wait`);
    await vi.waitFor(() => expect(release).toBeDefined());

    const exit = vi.fn();
    const stopping = shutDown(app, 5000, exit);
    expect(app.get(Lifecycle).shuttingDown).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(fetch(`${url}/health/live`)).rejects.toThrow(); // no new connections
    expect(exit).not.toHaveBeenCalled(); // still waiting for the request

    releaseWaiting();
    expect((await inFlight).status).toBe(200);
    await stopping;
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits with 1 when closing takes longer than the limit', async () => {
    const { app, url } = await started();
    release = undefined;
    const stuck = fetch(`${url}/wait`).catch(() => undefined);
    await vi.waitFor(() => expect(release).toBeDefined());

    const exit = vi.fn();
    void shutDown(app, 200, exit);
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1), { timeout: 2000 });

    releaseWaiting();
    (app.getHttpServer() as Server).closeAllConnections();
    await stuck;
  });
});
