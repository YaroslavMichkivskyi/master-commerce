import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BaseEnv,
  correlationHeaders,
  httpLoggerOptions,
  requestContext,
  requestIdFrom,
} from '../src/index.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface LogLine {
  level: number;
  msg: string;
  [key: string]: unknown;
}

/**
 * A bare HTTP server with the same middleware order a service gets: request context
 * first, then the request logger; `handler` answers.
 */
function server(
  lines: LogLine[],
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  env: Partial<BaseEnv> = {},
) {
  const logger = pinoHttp(
    httpLoggerOptions({ ...new BaseEnv(), ...env }, { service: 'test-service', version: '1.2.3' }),
    { write: (s: string) => void lines.push(JSON.parse(s) as LogLine) },
  );
  return createServer((req, res) => {
    requestContext(req, res, () => {
      logger(req, res);
      void handler(req, res);
    });
  });
}

describe('requestIdFrom (FR-011)', () => {
  it('keeps a well-formed id', () => {
    expect(requestIdFrom('order-42.a:b')).toBe('order-42.a:b');
  });

  it.each(['has spaces', 'x'.repeat(129), 'quote"s', '', undefined, ['a', 'b']])(
    'replaces %j with a new UUID',
    (id) => {
      expect(requestIdFrom(id)).toMatch(UUID);
    },
  );
});

describe('request context (FR-011, FR-012)', () => {
  it('returns the id in the response header', async () => {
    const app = server([], (_req, res) => void res.end('ok'));
    const res = await request(app).get('/').set('X-Request-Id', 'abc-1').expect(200);
    expect(res.headers['x-request-id']).toBe('abc-1');
    const fresh = await request(app).get('/').expect(200);
    expect(fresh.headers['x-request-id']).toMatch(UUID);
  });

  it('gives the handler the id for its own calls, also after awaits', async () => {
    const app = server([], async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      res.end(JSON.stringify(correlationHeaders()));
    });
    const res = await request(app).get('/').set('X-Request-Id', 'ctx-1').expect(200);
    expect(JSON.parse(res.text)).toEqual({ 'x-request-id': 'ctx-1' });
  });

  it('has no id outside a request', () => {
    expect(correlationHeaders()).toEqual({});
  });
});

describe('request logs (FR-010, FR-013)', () => {
  const lines: LogLine[] = [];
  beforeEach(() => void (lines.length = 0));

  it('writes one JSON line with service, version, request id, status and duration', async () => {
    const app = server(lines, (_req, res) => void res.end('ok'));
    await request(app).get('/things/7?x=1').set('X-Request-Id', 'log-1').expect(200);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 30,
      service: 'test-service',
      version: '1.2.3',
      requestId: 'log-1',
      req: { method: 'GET', url: '/things/7?x=1' },
      res: { statusCode: 200 },
    });
    expect(typeof lines[0]?.responseTime).toBe('number');
  });

  it('logs 4xx as warn and 5xx as error, without a made-up error object', async () => {
    let status = 404;
    const app = server(lines, (_req, res) => {
      res.statusCode = status;
      res.end();
    });
    await request(app).get('/a').expect(404);
    status = 500;
    await request(app).get('/b').expect(500);
    expect(lines.map((l) => l.level)).toEqual([40, 50]);
    expect(lines[1]).not.toHaveProperty('err');
  });

  it('never logs request headers, so no credentials', async () => {
    const app = server(lines, (_req, res) => void res.end('ok'));
    await request(app)
      .get('/')
      .set('Authorization', 'Bearer top-secret-token')
      .set('Cookie', 'session=top-secret-cookie')
      .expect(200);
    expect(JSON.stringify(lines)).not.toMatch(/top-secret/);
  });

  it.each(['/health/live', '/health/ready', '/metrics', '/docs', '/docs-json'])(
    'does not log %s',
    async (path) => {
      const app = server(lines, (_req, res) => void res.end('ok'));
      await request(app).get(path).expect(200);
      expect(lines).toEqual([]);
    },
  );

  it('follows LOG_LEVEL', async () => {
    const app = server(lines, (_req, res) => void res.end('ok'), { LOG_LEVEL: 'warn' });
    await request(app).get('/').expect(200);
    expect(lines).toEqual([]);
  });

  it('LOG_PRETTY switches to pino-pretty, which is installed', () => {
    const options = httpLoggerOptions(
      { ...new BaseEnv(), LOG_PRETTY: true },
      { service: 's', version: '1' },
    );
    const target = (options.transport as { target: string }).target;
    expect(target).toMatch(/pino-pretty/);
    expect(existsSync(target)).toBe(true);
  });
});
