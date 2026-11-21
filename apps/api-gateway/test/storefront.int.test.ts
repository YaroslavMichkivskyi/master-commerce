import 'reflect-metadata';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// The storefront API of the gateway against a stub catalog-service (TASK-6 FR-020).

type Behaviour = (req: IncomingMessage, res: ServerResponse) => void;
interface OpenApiBody {
  paths: Record<string, Record<string, { security?: unknown[]; responses: object }>>;
}

const P = '/api/v1/catalog';

// Every storefront route: gateway path → the catalog's path, query kept.
const ROUTES: [string, string][] = [
  ['/categories', '/storefront/categories'],
  [
    '/categories/graphics-cards/products?brand=asus,msi&memory_size=12-&page=2',
    '/storefront/categories/graphics-cards/products?brand=asus%2Cmsi&memory_size=12-&page=2',
  ],
  ['/brands/asus/products?category=ssds', '/storefront/brands/asus/products?category=ssds'],
  ['/search?q=rtx%2060&sort=price-asc', '/storefront/search?q=rtx+60&sort=price-asc'],
  ['/products/asus-rog-1x2', '/storefront/products/asus-rog-1x2'],
  ['/new?limit=5', '/storefront/new?limit=5'],
  ['/sitemap', '/storefront/sitemap'],
  ['/sitemap/products/2', '/storefront/sitemap/products/2'],
];

describe('api-gateway storefront → catalog-service', () => {
  let upstream: Server;
  let behaviour: Behaviour;
  let seen: string | undefined;
  let app: INestApplication;
  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      seen = req.url;
      behaviour(req, res);
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const { port } = upstream.address() as AddressInfo;
    process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${port}`;
    process.env.UPSTREAM_TIMEOUT_MS = '300';
    app = await createApp();
    await app.init();
  });

  beforeEach(() => {
    seen = undefined;
    behaviour = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }));
    };
  });

  afterAll(async () => {
    await app?.close();
    upstream?.closeAllConnections();
    await new Promise((resolve) => upstream?.close(resolve));
  });

  it.each(ROUTES)('GET %s goes to the catalog with its query', async (path, target) => {
    const res = await http().get(`${P}${path}`).expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(seen).toBe(target);
  });

  it('answers the catalog problem as its own, at its own path', async () => {
    behaviour = (_req, res) => {
      res.writeHead(400, { 'content-type': 'application/problem+json' }).end(
        JSON.stringify({
          status: 400,
          detail: 'The request is invalid',
          errors: [{ field: 'page', messages: ['page must be a whole number from 1 to 100'] }],
        }),
      );
    };
    const res = await http().get(`${P}/categories/gpus/products?page=101`).expect(400);
    expect(res.body).toMatchObject({
      status: 400,
      instance: `${P}/categories/gpus/products?page=101`,
      errors: [{ field: 'page' }],
    });
  });

  it.each(['..%2Fadmin', 'Not-A-Slug', '%2E%2E'])(
    'answers 404 for the slug %s without calling the catalog',
    async (slug) => {
      await http().get(`${P}/products/${slug}`).expect(404);
      await http().get(`${P}/categories/${slug}/products`).expect(404);
      expect(seen).toBeUndefined();
    },
  );

  it('documents the 8 storefront operations, each public', async () => {
    const { paths } = (await http().get('/docs-json').expect(200)).body as OpenApiBody;
    const ops = Object.entries(paths)
      .filter(([path]) => path.startsWith(`${P}/`))
      .flatMap(([, item]) => Object.values(item));
    expect(ops).toHaveLength(ROUTES.length);
    for (const op of ops) {
      expect(op.security).toEqual([]);
      expect(Object.keys(op.responses)).toEqual(expect.arrayContaining(['200', '502', '503']));
    }
  });
});
