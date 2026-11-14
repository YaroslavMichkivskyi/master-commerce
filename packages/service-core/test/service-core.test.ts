import 'reflect-metadata';
import { type Server } from 'node:http';
import {
  Body,
  ConsoleLogger,
  Controller,
  Get,
  type INestApplication,
  Injectable,
  Logger,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { IsInt, IsString, Matches, MinLength } from 'class-validator';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  BaseEnv,
  correlationHeaders,
  createServiceApp,
  EnvInt,
  Lifecycle,
  Public,
  type ReadinessCheck,
  Secret,
  ServiceCoreModule,
  startService,
} from '../src/index.js';

class TestEnv extends BaseEnv {
  @EnvInt()
  @IsInt()
  TEST_PORT: number = 0;

  @Secret()
  @IsString()
  @Matches(/^postgres:\/\//, { message: 'TEST_DATABASE_URL must be a postgres:// URL' })
  TEST_DATABASE_URL!: string;
}

@Injectable()
class FakeDatabase implements ReadinessCheck {
  static up = true;
  readonly name = 'database';
  check(): Promise<void> {
    return FakeDatabase.up ? Promise.resolve() : Promise.reject(new Error('ECONNREFUSED'));
  }
}

class CreateThingDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

@Controller('things')
@Public()
class ThingsController {
  private readonly logger = new Logger('Things');

  /** The service's own env class is injectable. */
  constructor(private readonly env: TestEnv) {}

  @Get('context')
  async context(): Promise<Record<string, string>> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.logger.log('handling context');
    return correlationHeaders();
  }

  @Get('env')
  port(): { port: number } {
    return { port: this.env.TEST_PORT };
  }

  @Get('boom')
  boom(): never {
    throw new Error('password=hunter2');
  }

  @Get(':id')
  one(@Param('id') id: string): { id: string } {
    return { id };
  }

  @Post()
  create(@Body() body: CreateThingDto): CreateThingDto {
    return body;
  }
}

interface LogLine {
  level: number;
  msg: string;
  [key: string]: unknown;
}

/** A fresh app module, logging into `lines`. */
function testModule(lines: LogLine[]) {
  @Module({
    imports: [
      ServiceCoreModule.forRoot({
        service: 'test-service',
        version: '1.2.3',
        description: 'A service for the service-core tests',
        env: TestEnv,
        portVariable: 'TEST_PORT',
        readiness: [FakeDatabase],
        logDestination: { write: (s: string) => void lines.push(JSON.parse(s) as LogLine) },
      }),
    ],
    controllers: [ThingsController],
  })
  class TestAppModule {}
  return TestAppModule;
}

describe('createServiceApp (FR-061)', () => {
  const lines: LogLine[] = [];
  let startup: LogLine[] = [];
  let app: INestApplication;
  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    process.env.TEST_DATABASE_URL = 'postgres://shop@localhost/shop';
    process.env.TEST_PORT = '4999';
    app = await createServiceApp(testModule(lines));
    await app.init();
    startup = [...lines];
  });

  afterEach(() => {
    FakeDatabase.up = true;
    lines.length = 0;
  });

  afterAll(async () => {
    delete process.env.TEST_PORT;
    await app?.close();
  });

  it("writes Nest's start-up lines through the same logger", () => {
    expect(startup.find((l) => l.msg === 'Starting Nest application...')).toMatchObject({
      service: 'test-service',
      context: 'NestFactory',
    });
    expect(startup.some((l) => l.msg.startsWith('Mapped {/things/:id, GET}'))).toBe(true);
  });

  it('checks the config and gives the service its env class', async () => {
    const res = await http().get('/things/env').expect(200);
    expect(res.body).toEqual({ port: 4999 });
  });

  it('keeps the request id through the handler and in every log line', async () => {
    const res = await http().get('/things/context').set('X-Request-Id', 'ctx-1').expect(200);
    expect(res.headers['x-request-id']).toBe('ctx-1');
    expect(res.body).toEqual({ 'x-request-id': 'ctx-1' });
    expect(lines.find((l) => l.msg === 'handling context')).toMatchObject({
      requestId: 'ctx-1',
      context: 'Things',
      service: 'test-service',
    });
    expect(lines.find((l) => l.msg === 'GET /things/context 200')).toMatchObject({
      requestId: 'ctx-1',
      version: '1.2.3',
    });
  });

  it('answers errors as problem details and logs the cause through the same logger', async () => {
    const res = await http().get('/things/boom').expect(500);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(lines.some((l) => l.level === 50 && JSON.stringify(l).includes('hunter2'))).toBe(true);
  });

  it('validates every body', async () => {
    const res = await http().post('/things').send({ name: '', extra: 1 }).expect(400);
    const fields = (res.body as { errors: { field: string }[] }).errors.map((e) => e.field);
    expect(fields.sort()).toEqual(['extra', 'name']);
  });

  it('serves the probes with the declared readiness checks', async () => {
    await http().get('/health/live').expect(200);
    await http().get('/health/ready').expect(200);
    FakeDatabase.up = false;
    await http().get('/health/ready').expect(503);
  });

  it('counts requests in /metrics, labelled with the service', async () => {
    await http().get('/things/1').expect(200);
    const res = await http().get('/metrics').expect(200);
    expect(res.text).toMatch(/http_requests_total\{[^}]*route="\/things\/:id"[^}]*\} \d/);
    expect(res.text).toContain('service="test-service"');
  });

  it('documents its own and the service endpoints, all with an auth requirement', async () => {
    const doc = (await http().get('/docs-json').expect(200)).body as {
      info: { title: string; version: string };
      paths: Record<string, Record<string, { security?: unknown[] }>>;
    };
    expect(doc.info).toMatchObject({ title: 'test-service', version: '1.2.3' });
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/health/live', '/health/ready', '/metrics', '/things/{id}']),
    );
    for (const item of Object.values(doc.paths)) {
      for (const op of Object.values(item)) expect(op.security).toEqual([]);
    }
  });

  it('does not log probe, metrics and docs requests', async () => {
    await http().get('/health/live').expect(200);
    await http().get('/metrics').expect(200);
    await http().get('/docs-json').expect(200);
    expect(lines.filter((l) => l.res)).toEqual([]);
  });
});

describe('configuration errors (FR-001)', () => {
  it('stop building the app and name the variable', async () => {
    process.env.TEST_DATABASE_URL = 'mysql://root:hunter2@db/shop';
    const built = createServiceApp(testModule([]));
    await expect(built).rejects.toThrow('TEST_DATABASE_URL must be a postgres:// URL');
    await expect(built).rejects.not.toThrow('hunter2');
  });
});

describe('startService (FR-060, FR-061)', () => {
  it('listens on the configured port and stops on SIGTERM', async () => {
    process.env.TEST_DATABASE_URL = 'postgres://shop@localhost/shop';
    process.env.TEST_PORT = '0';
    const signals = ['SIGTERM', 'SIGINT'] as const;
    const before = new Set(signals.flatMap((s) => process.listeners(s)));
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    try {
      const app = await startService(testModule([]));
      const url = (await app.getUrl()).replace('[::1]', 'localhost');
      await request(url).get('/health/live').expect(200);

      // Call the handler startService registered, without signalling the test runner.
      const onSigterm = process.listeners('SIGTERM').find((l) => !before.has(l));
      expect(onSigterm).toBeDefined();
      onSigterm?.('SIGTERM');
      expect(app.get(Lifecycle).shuttingDown).toBe(true);
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    } finally {
      for (const s of signals) {
        for (const l of process.listeners(s)) if (!before.has(l)) process.off(s, l);
      }
      exit.mockRestore();
      delete process.env.TEST_PORT;
    }
  });

  it('ends the process with 1 on a bad config, printing only the message', async () => {
    process.env.TEST_DATABASE_URL = 'not-a-url';
    // A real start has Nest's console logger; earlier tests in this process replaced it.
    Logger.overrideLogger(new ConsoleLogger());
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Nest's console logger writes straight to the streams.
    const written: string[] = [];
    const capture = (chunk: unknown): boolean => written.push(String(chunk)) > 0;
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(capture);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(capture);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exited');
    });
    try {
      await expect(startService(testModule([]))).rejects.toThrow('exited');
      expect(exit).toHaveBeenCalledWith(1);
      expect(error).toHaveBeenCalledOnce();
      expect(String(error.mock.calls[0]?.[0])).toMatch(
        /^Invalid configuration[^]*TEST_DATABASE_URL/,
      );
      // Not the same error again with its stack in Nest's text format.
      expect(written).toEqual([]);
    } finally {
      exit.mockRestore();
      stdout.mockRestore();
      stderr.mockRestore();
      error.mockRestore();
    }
  });
});
