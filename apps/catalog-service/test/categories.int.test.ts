import 'reflect-metadata';
import { type Server } from 'node:http';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { type INestApplication } from '@nestjs/common';
import { CategoryListDto } from '@master-commerce/dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { createPool, prepareDatabase } from '../src/db/database.js';
import { SEED_CATEGORIES } from '../src/db/seed.js';

interface HealthBody {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
}

interface OpenApiBody {
  paths: Record<string, unknown>;
  components: { schemas: Record<string, unknown> };
}

// FR-051: the real thread inside the service — migrations, seed, endpoint — on a real Postgres.
describe('catalog-service against PostgreSQL', () => {
  let container: StartedPostgreSqlContainer;
  let containerStopped = false;
  let app: INestApplication;

  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17.11-alpine').start();
    process.env.CATALOG_DATABASE_URL = container.getConnectionUri();
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (!containerStopped) await container?.stop();
  });

  it('migrates and seeds idempotently (FR-002)', async () => {
    const pool = createPool(container.getConnectionUri());
    try {
      await prepareDatabase(pool); // the app already ran it once
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

  it('GET /health reports the database up (FR-004)', async () => {
    const res = await http().get('/health').expect(200);
    expect((res.body as HealthBody).info?.database?.status).toBe('up');
  });

  it('documents every route in OpenAPI (FR-012)', async () => {
    const res = await http().get('/docs-json').expect(200);
    const body = res.body as OpenApiBody;
    expect(Object.keys(body.paths).sort()).toEqual(['/categories', '/health']);
    expect(body.components.schemas).toHaveProperty('CategoryListDto');
  });

  // Last: it stops the database.
  it('GET /health answers 503 when the database is gone (FR-004)', async () => {
    await container.stop();
    containerStopped = true;

    const res = await http().get('/health').expect(503);
    expect((res.body as HealthBody).error?.database?.status).toBe('down');
  });
});
