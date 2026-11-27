import 'reflect-metadata';
import { type Server } from 'node:http';
import { type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { type INestApplication } from '@nestjs/common';
import { CategoryListDto } from '@master-commerce/dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { createPool } from '../src/db/database.js';
import { migrateDatabase } from '../src/db/migrate.js';
import { SEED_CATEGORIES } from '../src/db/seed.js';
import { APP_PASSWORD, startCatalogDatabase } from './support/catalog-database.js';

interface HealthBody {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
}

interface OpenApiBody {
  paths: Record<string, Record<string, { security?: unknown[] }>>;
  components: { schemas: Record<string, unknown> };
}

// FR-051: the real thread inside the service — migrations, seed, endpoint — on a real Postgres.
describe('catalog-service against PostgreSQL', () => {
  let container: StartedPostgreSqlContainer;
  let ownerUrl: string;
  let containerStopped = false;
  let app: INestApplication;

  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    const db = await startCatalogDatabase();
    ({ container, ownerUrl } = db);
    process.env.CATALOG_DATABASE_URL = db.appUrl;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (!containerStopped) await container?.stop();
  });

  it('migrates and seeds idempotently (FR-002)', async () => {
    await migrateDatabase(ownerUrl, APP_PASSWORD); // the harness already ran it once
    const pool = createPool(ownerUrl);
    try {
      const { rows } = await pool.query<{ count: string }>('select count(*) from category');
      expect(Number(rows[0]?.count)).toBe(SEED_CATEGORIES.length);
    } finally {
      await pool.end();
    }
  });

  it('GET /categories returns the seeded list in display order (FR-003)', async () => {
    const res = await http().get('/categories').expect(200);
    const body = res.body as CategoryListDto;

    expect(body.items.map((c) => c.slug)).toEqual(SEED_CATEGORIES.map((c) => c.slug));
    const dto = plainToInstance(CategoryListDto, body);
    expect(validateSync(dto, { forbidUnknownValues: true })).toEqual([]);
  });

  it('shows a new row without any code change', async () => {
    const client = new pg.Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    await client.query(
      "insert into category(name, slug, sort_order) values ('Monitors', 'monitors', 70)",
    );
    await client.end();

    const res = await http().get('/categories').expect(200);
    const body = res.body as CategoryListDto;
    expect(body.items.at(-1)).toMatchObject({ name: 'Monitors', slug: 'monitors' });
  });

  it('says which category is the parent, and leaves deleted ones out (FR-014)', async () => {
    const client = new pg.Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    try {
      await client.query(
        `insert into category(name, slug, sort_order, parent_id)
         select 'Gaming monitors', 'gaming-monitors', 80, id from category where slug = 'monitors'`,
      );
      await client.query(
        "insert into category(name, slug, sort_order, deleted_at) values ('Old', 'old', 90, now())",
      );
    } finally {
      await client.end();
    }

    const { items } = (await http().get('/categories').expect(200)).body as CategoryListDto;
    const monitors = items.find((c) => c.slug === 'monitors');
    expect(monitors?.parentId).toBeNull();
    expect(items.find((c) => c.slug === 'gaming-monitors')?.parentId).toBe(monitors?.id);
    expect(items.map((c) => c.slug)).not.toContain('old');
  });

  it('GET /health/ready reports the database up (TASK-3 FR-021)', async () => {
    const res = await http().get('/health/ready').expect(200);
    expect((res.body as HealthBody).info?.database?.status).toBe('up');
  });

  it('returns the X-Request-Id the gateway sends (TASK-3 FR-011, FR-012)', async () => {
    const res = await http().get('/categories').set('X-Request-Id', 'from-gateway-1').expect(200);
    expect(res.headers['x-request-id']).toBe('from-gateway-1');
  });

  it('counts its requests in /metrics (TASK-3 FR-030)', async () => {
    const res = await http().get('/metrics').expect(200);
    expect(res.text).toMatch(
      /http_requests_total\{method="GET",route="\/categories",status_code="200",service="catalog-service"\}/,
    );
  });

  it('documents every route in OpenAPI, each one public (FR-012, TASK-3 FR-051)', async () => {
    const res = await http().get('/docs-json').expect(200);
    const body = res.body as OpenApiBody;
    expect(Object.keys(body.paths).sort()).toEqual([
      '/admin/brands',
      '/admin/brands/by-slug/{slug}',
      '/admin/brands/{id}',
      '/admin/brands/{id}/restore',
      '/admin/categories',
      '/admin/categories/by-slug/{slug}',
      '/admin/categories/tree',
      '/admin/categories/{id}',
      '/admin/categories/{id}/attributes',
      '/admin/categories/{id}/restore',
      '/admin/products',
      '/admin/products/by-slug/{slug}',
      '/admin/products/{id}',
      '/admin/products/{id}/publish',
      '/admin/products/{id}/restore',
      '/admin/products/{id}/unpublish',
      '/categories',
      '/health/live',
      '/health/ready',
      '/metrics',
      '/storefront/brands/{slug}/products',
      '/storefront/categories',
      '/storefront/categories/{slug}/products',
      '/storefront/new',
      '/storefront/products/{slug}',
      '/storefront/search',
      '/storefront/sitemap',
      '/storefront/sitemap/products/{part}',
    ]);
    expect(body.components.schemas).toHaveProperty('CategoryListDto');
    expect(body.components.schemas).toHaveProperty('ProblemDto');
    for (const item of Object.values(body.paths)) {
      for (const op of Object.values(item)) expect(op.security).toEqual([]);
    }
  });

  // Last ones: the first stops the database.
  it('GET /health/ready answers 503 when the database is gone, liveness stays 200', async () => {
    await container.stop();
    containerStopped = true;

    await http().get('/health/live').expect(200);
    const res = await http().get('/health/ready').expect(503);
    // No driver message: it would name the host and the database user.
    expect((res.body as HealthBody).error?.database).toEqual({
      status: 'down',
      message: 'database unreachable',
    });
  });

  it('GET /categories answers 500 problem+json without internals when the database is gone', async () => {
    const res = await http().get('/categories').expect(500);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/categories',
    });
  });
});
