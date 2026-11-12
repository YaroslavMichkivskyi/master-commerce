import 'reflect-metadata';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// FR-010 / FR-011: the gateway against a stub catalog-service on a real socket.
interface OpenApiBody {
  paths: Record<string, { get?: { responses: Record<string, unknown> } }>;
}

type Behaviour = (res: ServerResponse) => void;

const LIST = {
  items: [
    { id: '4f6c1c9e-2b1a-4d8e-9a57-1b2c3d4e5f60', name: 'CPUs', slug: 'cpus', sortOrder: 10 },
  ],
};

describe('api-gateway -> catalog-service', () => {
  let upstream: Server;
  let behaviour: Behaviour;
  let app: INestApplication;

  beforeAll(async () => {
    upstream = createServer((_req, res) => behaviour(res));
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
    expect(res.body).toEqual(LIST);
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

  it('keeps its own health independent of the catalog', async () => {
    await request(app.getHttpServer() as Server)
      .get('/health')
      .expect(200, { status: 'ok' });
  });

  it('documents every route in OpenAPI (FR-012)', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get('/docs-json')
      .expect(200);
    const body = res.body as OpenApiBody;
    expect(Object.keys(body.paths).sort()).toEqual(['/api/v1/categories', '/health']);
    const responses = body.paths['/api/v1/categories']?.get?.responses ?? {};
    expect(Object.keys(responses).sort()).toEqual(['200', '502', '503']);
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
