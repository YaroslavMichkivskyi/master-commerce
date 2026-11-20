import 'reflect-metadata';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';
import { type HttpException, type INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { CatalogClient } from '../src/catalog/catalog.client.js';
import {
  UpstreamBadResponseError,
  UpstreamProblem,
  UpstreamUnavailableError,
} from '../src/catalog/upstream.errors.js';

type Behaviour = (res: ServerResponse) => void;

interface Seen {
  method?: string;
  url?: string;
  headers: IncomingMessage['headers'];
  body: string;
}

// CatalogClient.forward() against a stub catalog-service on a real socket (research R-11).
describe('CatalogClient.forward()', () => {
  let upstream: Server;
  let behaviour: Behaviour;
  let seen: Seen;
  let app: INestApplication;
  let client: CatalogClient;

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        seen = { method: req.method, url: req.url, headers: req.headers, body };
        behaviour(res);
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const { port } = upstream.address() as AddressInfo;
    process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${port}`;
    process.env.UPSTREAM_TIMEOUT_MS = '300';
    app = await createApp();
    await app.init();
    client = app.get(CatalogClient);
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
    (status: number, body: unknown, headers: Record<string, string> = {}): Behaviour =>
    (res) => {
      res
        .writeHead(status, { 'content-type': 'application/json', ...headers })
        .end(JSON.stringify(body));
    };
  const failure = (call: Promise<unknown>) =>
    call.then(
      () => expect.unreachable(),
      (error: unknown) => error,
    );

  it('sends method, path, query, body and If-Match; returns status, body and ETag', async () => {
    behaviour = json(200, { id: 'x', version: 4 }, { etag: '"4"' });
    const res = await client.forward('PATCH', {
      path: '/admin/brands/x',
      query: { limit: 2, published: false, cursor: undefined },
      body: { name: 'ASUS' },
      ifMatch: '"3"',
    });
    expect(res).toEqual({ status: 200, body: { id: 'x', version: 4 }, etag: '"4"' });
    expect(seen).toMatchObject({
      method: 'PATCH',
      url: '/admin/brands/x?limit=2&published=false',
      body: '{"name":"ASUS"}',
    });
    expect(seen.headers).toMatchObject({
      'if-match': '"3"',
      'content-type': 'application/json',
      accept: 'application/json',
    });
  });

  it('sends no body, content type or If-Match it was not given', async () => {
    behaviour = json(200, { items: [] });
    await client.forward('GET', { path: '/admin/brands' });
    expect(seen.body).toBe('');
    expect(seen.headers['content-type']).toBeUndefined();
    expect(seen.headers['if-match']).toBeUndefined();
  });

  it('returns no body for 204', async () => {
    behaviour = (res) => res.writeHead(204).end();
    expect(await client.forward('DELETE', { path: '/admin/brands/x', ifMatch: '"1"' })).toEqual({
      status: 204,
      body: undefined,
      etag: null,
    });
  });

  it.each([400, 404, 409, 412, 428])('passes a %i problem on as the answer', async (status) => {
    behaviour = json(status, {
      type: 'about:blank',
      status,
      detail: `catalog says ${status}`,
      instance: '/admin/products',
      errors: [{ field: 'specs.colour', messages: ['colour is not an attribute'] }],
    });
    const error = (await failure(
      client.forward('POST', { path: '/admin/products' }),
    )) as HttpException;
    expect(error).toBeInstanceOf(UpstreamProblem);
    expect(error.getStatus()).toBe(status);
    expect(error.message).toBe(`catalog says ${status}`);
    expect(error.getResponse()).toMatchObject({
      errors: [{ field: 'specs.colour', messages: ['colour is not an attribute'] }],
    });
  });

  it('keeps the status of a 4xx without a problem body, with the status phrase', async () => {
    behaviour = (res) => res.writeHead(404, { 'content-type': 'text/plain' }).end('nope');
    const error = (await failure(client.forward('GET', { path: '/x' }))) as HttpException;
    expect(error.getStatus()).toBe(404);
    expect(error.message).toBe('Not Found');
  });

  it('turns a 5xx or a body that is not JSON into 502', async () => {
    behaviour = json(500, { detail: 'internal' });
    expect(await failure(client.forward('GET', { path: '/x' }))).toBeInstanceOf(
      UpstreamBadResponseError,
    );
    behaviour = (res) => res.writeHead(200, { 'content-type': 'text/plain' }).end('{oops');
    expect(await failure(client.forward('GET', { path: '/x' }))).toBeInstanceOf(
      UpstreamBadResponseError,
    );
  });

  it('turns no answer in time into 503', async () => {
    behaviour = () => undefined; // never answers
    expect(await failure(client.forward('GET', { path: '/x' }))).toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});
