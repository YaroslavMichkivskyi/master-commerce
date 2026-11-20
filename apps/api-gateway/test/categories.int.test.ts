import 'reflect-metadata';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// FR-010 / FR-011: the gateway against a stub catalog-service on a real socket.
interface OpenApiBody {
  paths: Record<string, { get?: { responses: Record<string, unknown>; security?: unknown[] } }>;
}

type Behaviour = (res: ServerResponse) => void;

const LIST = {
  items: [
    {
      id: '4f6c1c9e-2b1a-4d8e-9a57-1b2c3d4e5f60',
      name: 'Components',
      slug: 'components',
      sortOrder: 10,
      parentId: null,
    },
    {
      id: '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f61',
      name: 'CPUs',
      slug: 'cpus',
      sortOrder: 20,
      parentId: '4f6c1c9e-2b1a-4d8e-9a57-1b2c3d4e5f60',
    },
  ],
};

describe('api-gateway -> catalog-service', () => {
  let upstream: Server;
  let behaviour: Behaviour;
  let upstreamRequestId: unknown;
  let app: INestApplication;

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      upstreamRequestId = req.headers['x-request-id'];
      behaviour(res);
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const { port } = upstream.address() as AddressInfo;
    process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${port}`;
    process.env.UPSTREAM_TIMEOUT_MS = '300';
    app = await createApp();
    await app.init();
  });

  afterEach(() => {
    behaviour = () => undefined;
  });

  afterAll(async () => {
    await app?.close();
    upstream?.closeAllConnections();
    await new Promise((resolve) => upstream?.close(resolve));
  });

  const json =
    (status: number, body: unknown): Behaviour =>
    (res) => {
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    };

  it('passes the category list through (FR-010)', async () => {
    behaviour = json(200, LIST);
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(200);
    expect(res.body).toEqual(LIST);
  });

  it('accepts a catalog that does not send parentId yet (an older catalog during a deploy)', async () => {
    const older = { items: LIST.items.map(({ parentId: _parentId, ...rest }) => rest) };
    behaviour = json(200, older);
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(200);
    expect(res.body).toEqual(older);
  });

  it('answers 502 when a parentId is not a UUID', async () => {
    behaviour = json(200, { items: [{ ...LIST.items[0], parentId: 'components' }] });
    await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(502);
  });

  it('answers 502 problem+json when the catalog fails (FR-011)', async () => {
    behaviour = json(500, { message: 'boom' });
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(502);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({ status: 502, title: 'Bad Gateway' });
  });

  it('drops fields the shared contract does not declare', async () => {
    behaviour = json(200, {
      items: [{ ...LIST.items[0], createdAt: '2026-11-12', internalNote: 'x' }],
      total: 1,
    });
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(200);
    expect(res.body).toEqual({ items: [LIST.items[0]] });
  });

  it('answers 503 when the body is slower than the timeout', async () => {
    behaviour = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"items":'); // headers and half the body, the rest never comes in time
    };
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(503);
    expect(res.body).toMatchObject({ status: 503, detail: 'catalog-service is unavailable' });
  });

  it('answers 502 when the catalog breaks the contract', async () => {
    behaviour = json(200, { items: [{ id: 'not-a-uuid', name: '', slug: 'X', sortOrder: 'a' }] });
    await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(502);
  });

  it.each([null, 42, 'ok', []])('answers 502 when the body is %j', async (body) => {
    behaviour = json(200, body);
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(502);
    expect(res.body).toMatchObject({ status: 502, title: 'Bad Gateway' });
  });

  it('frees the connection of an error answer without waiting for its body', async () => {
    let closed!: () => void;
    const socketClosed = new Promise<void>((resolve) => (closed = resolve));
    behaviour = (res) => {
      res.socket?.once('close', closed);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.write('{"message":'); // the rest of the error body never comes
    };
    await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(502);
    // Well before the 300 ms timeout, which would also free it.
    const early = new Promise<string>((resolve) => setTimeout(() => resolve('open'), 150));
    await expect(Promise.race([socketClosed.then(() => 'closed'), early])).resolves.toBe('closed');
  });

  it('answers 503 when the catalog times out (FR-011)', async () => {
    behaviour = () => undefined; // never answers
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(503);
    expect(res.body).toMatchObject({
      status: 503,
      detail: 'catalog-service is unavailable',
      instance: '/api/v1/categories',
    });
  });

  it('passes the X-Request-Id of the caller to the catalog (TASK-3 FR-011, FR-012)', async () => {
    behaviour = json(200, LIST);
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .set('X-Request-Id', 'browser-77')
      .expect(200);
    expect(upstreamRequestId).toBe('browser-77');
    expect(res.headers['x-request-id']).toBe('browser-77');
  });

  it('gives a request without an id a new one and sends the same to the catalog', async () => {
    behaviour = json(200, LIST);
    const res = await request(app.getHttpServer() as Server)
      .get('/api/v1/categories')
      .expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(upstreamRequestId).toBe(res.headers['x-request-id']);
  });

  it('keeps its health independent of the catalog (no readiness checks)', async () => {
    behaviour = () => undefined; // the catalog hangs
    await request(app.getHttpServer() as Server)
      .get('/health/live')
      .expect(200);
    await request(app.getHttpServer() as Server)
      .get('/health/ready')
      .expect(200);
  });

  it('documents every route in OpenAPI, each one public (FR-012, TASK-3 FR-051)', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get('/docs-json')
      .expect(200);
    const body = res.body as OpenApiBody;
    // The admin paths have their own test (admin.int.test.ts).
    const paths = Object.keys(body.paths).filter((p) => !p.startsWith('/api/v1/admin/'));
    expect(paths.sort()).toEqual([
      '/api/v1/categories',
      '/health/live',
      '/health/ready',
      '/metrics',
    ]);
    const operation = body.paths['/api/v1/categories']?.get;
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual(['200', '500', '502', '503']);
    expect(operation?.security).toEqual([]);
  });
});

describe('api-gateway with the catalog down', () => {
  it('answers 503 when nothing listens (connection refused)', async () => {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const { port } = probe.address() as AddressInfo;
    await new Promise((resolve) => probe.close(resolve));

    process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${port}`;
    const app = await createApp();
    await app.init();
    try {
      await request(app.getHttpServer() as Server)
        .get('/api/v1/categories')
        .expect(503);
    } finally {
      await app.close();
    }
  });
});
