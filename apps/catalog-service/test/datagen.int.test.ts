import 'reflect-metadata';
import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { type ProductDto, type ProductPageDto } from '@master-commerce/dto';
import { DatagenError, generate, output, type Table } from 'datagen';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attributesOf, pathTo, toRule } from '../src/admin/categories/tree.js';
import { validateSpecs } from '../src/admin/specs.js';
import { createApp } from '../src/bootstrap.js';
import { type Database } from '../src/db/database.js';
import { migrateDatabase } from '../src/db/migrate.js';
import {
  APP_PASSWORD,
  type CatalogDatabase,
  startCatalogDatabase,
} from './support/catalog-database.js';

// The data generator against the real catalog (TASK-5 FR-008, FR-010…FR-013, AC #3):
// a migrated database, the owner loads, the service works with the data as catalog_app.

const PRODUCTS = 2000;
const options = (seed: string, products = PRODUCTS) => ({ seed, products, zipf: 1.1 });

describe('datagen → catalog', () => {
  let database: CatalogDatabase;
  let owner: pg.Pool;
  let app: INestApplication;

  const http = () => request(app.getHttpServer() as Server);
  const count = async (table: string) =>
    (await owner.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0]!.n;

  beforeAll(async () => {
    database = await startCatalogDatabase();
    owner = new pg.Pool({ connectionString: database.ownerUrl });
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await owner?.end();
    await database?.container.stop();
  });

  it('refuses a database that is not migrated, before generating anything', async () => {
    await owner.query('create database unmigrated');
    const url = new URL(database.ownerUrl);
    url.pathname = '/unmigrated';
    await expect(output(generate(options('x')), { databaseUrl: url.toString() })).rejects.toThrow(
      /not migrated/,
    );
  });

  it('loads into a catalog with only the seed categories, replacing them (FR-010, FR-011)', async () => {
    expect(await count('category')).toBe(6); // the seed
    const result = await output(generate(options('int')), { databaseUrl: database.ownerUrl });
    expect(result.counts.product).toBe(PRODUCTS);
    expect(await count('product')).toBe(PRODUCTS);
    expect(await count('brand')).toBe(result.counts.brand);
    expect(await count('category')).toBe(result.counts.category);
    const seeded = await owner.query<{ slug: string }>(
      `select slug from category where slug = any($1) order by slug`,
      [['cpus', 'graphics-cards', 'laptops', 'memory', 'motherboards', 'storage']],
    );
    expect(seeded.rows).toHaveLength(6);
  });

  it('makes every product valid for its effective attributes, by the catalog itself (FR-008, AC #3)', async () => {
    const pool = new pg.Pool({ connectionString: database.appUrl });
    try {
      const db: Database = drizzle<Record<string, never>>(pool);
      const { rows } = await pool.query<{
        category_id: string;
        name: string;
        specs: Record<string, unknown>;
      }>(
        `select p.category_id, c.name, p.specs from product p join category c on c.id = p.category_id`,
      );
      const rules = new Map<string, ReturnType<typeof toRule>[]>();
      for (const id of new Set(rows.map((r) => r.category_id))) {
        const path = await pathTo(db, id);
        const attributes = await attributesOf(db, path);
        rules.set(
          id,
          path.flatMap((c) => (attributes.get(c) ?? []).map(toRule)),
        );
      }
      const invalid = rows
        .map((r) => validateSpecs(rules.get(r.category_id)!, r.specs, r.name))
        .filter((errors) => errors.length > 0);
      expect(invalid).toEqual([]);
      // Products only in leaves.
      const inner = await pool.query(
        `select 1 from product p where exists (select 1 from category c where c.parent_id = p.category_id)`,
      );
      expect(inner.rowCount).toBe(0);
    } finally {
      await pool.end();
    }
  });

  it('is served by the catalog service, running as catalog_app (FR-013)', async () => {
    const { rows } = await owner.query<{ id: string }>(
      `select id from category where slug = 'graphics-cards'`,
    );
    const gpus = rows[0]!.id;
    const page = (
      await http()
        .get('/admin/products')
        .query({ categoryId: gpus, published: 'true', limit: 5 })
        .expect(200)
    ).body as ProductPageDto;
    expect(page.items).toHaveLength(5);
    expect(page.items.every((p) => p.categoryId === gpus && p.published)).toBe(true);
    const next = (
      await http()
        .get('/admin/products')
        .query({ categoryId: gpus, limit: 5, cursor: page.nextCursor })
        .expect(200)
    ).body as ProductPageDto;
    expect(next.items[0]!.id > page.items[4]!.id).toBe(true);

    const product = page.items[0]!;
    const bySlug = (await http().get(`/admin/products/by-slug/${product.slug}`).expect(200))
      .body as ProductDto;
    expect(bySlug.id).toBe(product.id);
    const changed = await http()
      .patch(`/admin/products/${product.id}`)
      .set('If-Match', '"1"')
      .send({ priceCents: product.priceCents + 100, specs: product.specs })
      .expect(200);
    expect(changed.body).toMatchObject({ version: 2, priceCents: product.priceCents + 100 });

    const tree = await http().get('/admin/categories/tree').expect(200);
    expect((tree.body as { items: { slug: string }[] }).items.map((n) => n.slug)).toContain(
      'components',
    );
    await http().get('/categories').expect(200);
  });

  it('refuses a catalog with products without --reset, changing nothing (FR-011)', async () => {
    const before = await owner.query<{ id: string }>('select id from product order by id limit 1');
    await expect(
      output(generate(options('other')), { databaseUrl: database.ownerUrl }),
    ).rejects.toThrow(DatagenError);
    expect(await count('product')).toBe(PRODUCTS);
    const after = await owner.query<{ id: string }>('select id from product order by id limit 1');
    expect(after.rows).toEqual(before.rows);
  });

  it('leaves the database as it was when a load fails half way (FR-012)', async () => {
    const before = await count('product');
    // The 501st product breaks a CHECK (price > 0) in the middle of the COPY.
    const tables: Table[] = generate(options('broken', 1000)).map((t) =>
      t.name !== 'product'
        ? t
        : {
            ...t,
            rows: function* () {
              let i = 0;
              for (const row of t.rows()) {
                yield i++ === 500 ? row.map((cell, c) => (c === 7 ? -1 : cell)) : row;
              }
            },
          },
    );
    await expect(output(tables, { databaseUrl: database.ownerUrl, reset: true })).rejects.toThrow(
      /product_price_positive/,
    );
    expect(await count('product')).toBe(before);
    expect(await count('former_slug')).toBe(0);
  });

  it('replaces the whole catalog with --reset (FR-011)', async () => {
    const result = await output(generate(options('second', 500)), {
      databaseUrl: database.ownerUrl,
      reset: true,
    });
    expect(result.counts.product).toBe(500);
    expect(await count('product')).toBe(500);
  });

  it('is left alone by a later db:migrate: the seed adds nothing (TASK-4 seed rule)', async () => {
    const before = await count('category');
    await migrateDatabase(database.ownerUrl, APP_PASSWORD);
    expect(await count('category')).toBe(before);
  });
});
