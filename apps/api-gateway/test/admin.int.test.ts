import 'reflect-metadata';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';

// The admin API of the gateway against a stub catalog-service on a real socket
// (FR-050, FR-051, research R-11).

interface Seen {
  method?: string;
  url?: string;
  ifMatch?: string | string[];
  body: string;
}
type Behaviour = (req: IncomingMessage, res: ServerResponse) => void;
interface OpenApiBody {
  paths: Record<string, Record<string, { security?: unknown[]; responses: object }>>;
}

const ID = '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60';
const P = '/api/v1/admin/catalog';
const BRAND = { name: 'ASUS', slug: 'asus' };
const CATEGORY = { name: 'GPUs', slug: 'gpus' };
const PRODUCT = {
  name: 'GPU',
  slug: 'gpu',
  sku: 'GPU-1',
  brandId: ID,
  categoryId: ID,
  priceCents: 100,
  specs: { memory_size: 8 },
};
const ATTRIBUTES = {
  attributes: [{ code: 'rt', name: 'RT', type: 'boolean', required: false, sortOrder: 0 }],
};

// Every admin endpoint: method, gateway path, body → the catalog's path (24, contracts/http.md).
const ROUTES: [string, string, object | undefined, string][] = [
  ['POST', '/brands', BRAND, '/admin/brands'],
  ['GET', '/brands?limit=2', undefined, '/admin/brands?limit=2'],
  ['GET', `/brands/${ID}`, undefined, `/admin/brands/${ID}`],
  ['GET', '/brands/by-slug/asus', undefined, '/admin/brands/by-slug/asus'],
  ['PATCH', `/brands/${ID}`, { name: 'X' }, `/admin/brands/${ID}`],
  ['DELETE', `/brands/${ID}`, undefined, `/admin/brands/${ID}`],
  ['POST', `/brands/${ID}/restore`, undefined, `/admin/brands/${ID}/restore`],
  ['POST', '/categories', CATEGORY, '/admin/categories'],
  ['GET', '/categories/tree', undefined, '/admin/categories/tree'],
  ['GET', `/categories/${ID}`, undefined, `/admin/categories/${ID}`],
  ['GET', '/categories/by-slug/gpus', undefined, '/admin/categories/by-slug/gpus'],
  ['PATCH', `/categories/${ID}`, { parentId: null }, `/admin/categories/${ID}`],
  ['PUT', `/categories/${ID}/attributes`, ATTRIBUTES, `/admin/categories/${ID}/attributes`],
  ['DELETE', `/categories/${ID}`, undefined, `/admin/categories/${ID}`],
  ['POST', `/categories/${ID}/restore`, undefined, `/admin/categories/${ID}/restore`],
  ['POST', '/products', PRODUCT, '/admin/products'],
  [
    'GET',
    `/products?brandId=${ID}&published=true`,
    undefined,
    `/admin/products?brandId=${ID}&published=true`,
  ],
  ['GET', `/products/${ID}`, undefined, `/admin/products/${ID}`],
  ['GET', '/products/by-slug/gpu', undefined, '/admin/products/by-slug/gpu'],
  ['PATCH', `/products/${ID}`, { stock: 3 }, `/admin/products/${ID}`],
  ['POST', `/products/${ID}/publish`, undefined, `/admin/products/${ID}/publish`],
  ['POST', `/products/${ID}/unpublish`, undefined, `/admin/products/${ID}/unpublish`],
  ['DELETE', `/products/${ID}`, undefined, `/admin/products/${ID}`],
  ['POST', `/products/${ID}/restore`, undefined, `/admin/products/${ID}/restore`],
];

describe('api-gateway admin API -> catalog-service', () => {
  let upstream: Server;
  let behaviour: Behaviour;
  let seen: Seen | undefined;
  let app: INestApplication;

  const http = () => request(app.getHttpServer() as Server);
  const send = (method: string, path: string, body?: object) => {
    const call = http()[method.toLowerCase() as 'get'](`${P}${path}`).set('If-Match', '"1"');
    return body ? call.send(body) : call;
  };

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        seen = { method: req.method, url: req.url, ifMatch: req.headers['if-match'], body };
        behaviour(req, res);
      });
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
    // An answer like the catalog's: 204 for a delete, else the entity with its ETag.
    behaviour = (req, res) => {
      if (req.method === 'DELETE') return void res.writeHead(204).end();
      const status = req.method === 'POST' && !req.url?.includes('/' + ID) ? 201 : 200;
      res
        .writeHead(status, { 'content-type': 'application/json', etag: '"2"' })
        .end(JSON.stringify({ id: ID, version: 2 }));
    };
  });

  afterAll(async () => {
    await app?.close();
    upstream?.closeAllConnections();
    await new Promise((resolve) => upstream?.close(resolve));
  });

  it.each(ROUTES)('%s %s goes to the catalog unchanged', async (method, path, body, target) => {
    const res = await send(method, path, body);
    // Only a change of an existing entity sends the version on.
    const versioned = method !== 'GET' && path.includes(ID);
    expect(seen).toMatchObject({ method, url: target });
    expect(seen?.ifMatch).toBe(versioned ? '"1"' : undefined);
    expect(seen?.body ? JSON.parse(seen.body) : undefined).toEqual(body);
    if (method === 'DELETE') {
      expect(res.status).toBe(204);
    } else {
      expect(res.status).toBe(method === 'POST' && !path.includes(ID) ? 201 : 200);
      expect(res.body).toEqual({ id: ID, version: 2 });
      expect(res.headers.etag).toBe('"2"');
    }
  });

  it('answers the catalog problem as its own, at its own path', async () => {
    behaviour = (_req, res) => {
      res.writeHead(400, { 'content-type': 'application/problem+json' }).end(
        JSON.stringify({
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: 'The request is invalid',
          instance: '/admin/products',
          errors: [{ field: 'specs.colour', messages: ['colour is not an attribute of GPUs'] }],
        }),
      );
    };
    const res = await send('POST', '/products', PRODUCT).expect(400);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request is invalid',
      instance: `${P}/products`,
      errors: [{ field: 'specs.colour', messages: ['colour is not an attribute of GPUs'] }],
    });
  });

  it.each([
    [412, 'Product has changed since you read it'],
    [428, 'This change needs If-Match'],
  ])('passes %i on with its detail', async (status, detail) => {
    behaviour = (_req, res) => {
      res
        .writeHead(status, { 'content-type': 'application/problem+json' })
        .end(JSON.stringify({ status, detail }));
    };
    const res = await send('PATCH', `/products/${ID}`, { stock: 1 }).expect(status);
    expect(res.body).toMatchObject({ status, detail, instance: `${P}/products/${ID}` });
  });

  it('checks the request itself before calling the catalog', async () => {
    await send('GET', '/products/not-a-uuid').expect(400);
    await send('POST', '/brands', { ...BRAND, extra: 1 }).expect(400);
    await send('GET', '/products?published=yes').expect(400);
    expect(seen).toBeUndefined();
  });

  it('sends a slug as one path segment', async () => {
    await send('GET', '/brands/by-slug/a%2Fb').expect(200);
    expect(seen?.url).toBe('/admin/brands/by-slug/a%2Fb');
  });

  it('answers 502 for a catalog 5xx and 503 when it does not answer', async () => {
    behaviour = (_req, res) => void res.writeHead(500).end();
    await send('GET', '/brands').expect(502);
    behaviour = () => undefined;
    await send('GET', '/brands').expect(503);
  });

  it('documents all 24 admin operations, each public, with the forwarding answers', async () => {
    const { paths } = (await http().get('/docs-json').expect(200)).body as OpenApiBody;
    const operations = Object.entries(paths)
      .filter(([path]) => path.startsWith(`${P}/`))
      .flatMap(([path, item]) =>
        Object.entries(item).map(([method, op]) => ({ key: `${method} ${path}`, op })),
      );
    expect(operations).toHaveLength(ROUTES.length);
    for (const { op } of operations) {
      expect(op.security).toEqual([]);
      expect(Object.keys(op.responses)).toEqual(expect.arrayContaining(['400', '502', '503']));
    }
    expect(operations.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        `put ${P}/categories/{id}/attributes`,
        `post ${P}/products/{id}/publish`,
        `get ${P}/brands/by-slug/{slug}`,
      ]),
    );
  });
});
