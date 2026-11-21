import 'reflect-metadata';
import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { type BrandDto, type CategoryDetailDto, type ProductDto } from '@master-commerce/dto';
import { generate, output } from 'datagen';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

// The search document of a product, kept by the database (TASK-6 FR-010, research R-4,
// data-model): written through the admin API as catalog_app, read as the owner.

describe('product search document', () => {
  let database: CatalogDatabase;
  let owner: pg.Pool;
  let app: INestApplication;
  let brand: BrandDto;
  let category: CategoryDetailDto;

  const http = () => request(app.getHttpServer() as Server);
  /** The lexemes of a product's document with their weights, e.g. "rtx:1A". */
  const documentOf = async (id: string) =>
    (
      await owner.query<{ doc: string }>('select search::text as doc from product where id = $1', [
        id,
      ])
    ).rows[0]!.doc;
  const matches = async (id: string, query: string) =>
    (
      await owner.query<{ hit: boolean }>(
        `select search @@ to_tsquery('english', $2) as hit from product where id = $1`,
        [id, query],
      )
    ).rows[0]!.hit;
  const createProduct = async (name: string, sku: string) =>
    (
      await http()
        .post('/admin/products')
        .send({
          name,
          slug: sku.toLowerCase(),
          sku,
          description: 'Two fans and a backplate.',
          brandId: brand.id,
          categoryId: category.id,
          priceCents: 49999,
          specs: {},
        })
        .expect(201)
    ).body as ProductDto;

  beforeAll(async () => {
    database = await startCatalogDatabase();
    owner = new pg.Pool({ connectionString: database.ownerUrl });
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.init();
    brand = (await http().post('/admin/brands').send({ name: 'Zotac', slug: 'zotac' }).expect(201))
      .body as BrandDto;
    category = (
      await http()
        .post('/admin/categories')
        .send({ name: 'Video cards', slug: 'video-cards' })
        .expect(201)
    ).body as CategoryDetailDto;
  });

  afterAll(async () => {
    await app?.close();
    await owner?.end();
    await database?.container.stop();
  });

  it('is written on insert from name (A), brand (B), category (C) and description (D)', async () => {
    const p = await createProduct('Gaming Twin GeForce RTX 6070', 'DOC-1');
    const doc = await documentOf(p.id);
    expect(doc).toMatch(/'rtx':\d+A/);
    expect(doc).toMatch(/'zotac':\d+B/);
    expect(doc).toMatch(/'video':\d+C/);
    // Weight D is the default and has no letter; "backplate" is stemmed by english.
    expect(doc).toMatch(/'backplat':\d+( |$)/);
    expect(await matches(p.id, 'rtx & 607:*')).toBe(true);
    expect(await matches(p.id, 'zotac & card')).toBe(true);
  });

  it('follows a change of the product name', async () => {
    const p = await createProduct('Twin Edge GeForce RTX 6060', 'DOC-2');
    await http()
      .patch(`/admin/products/${p.id}`)
      .set('If-Match', '"1"')
      .send({ name: 'Trinity RTX 6080' })
      .expect(200);
    expect(await matches(p.id, '6080')).toBe(true);
    expect(await matches(p.id, '6060')).toBe(false);
  });

  it('follows a rename of the brand and of the category', async () => {
    const p = await createProduct('AMP Extreme RTX 6090', 'DOC-3');
    const current = (await http().get(`/admin/brands/${brand.id}`).expect(200)).body as BrandDto;
    await http()
      .patch(`/admin/brands/${brand.id}`)
      .set('If-Match', `"${current.version}"`)
      .send({ name: 'Zotac Gaming' })
      .expect(200);
    expect(await matches(p.id, 'zotac & gaming')).toBe(true);

    const c = (await http().get(`/admin/categories/${category.id}`).expect(200))
      .body as CategoryDetailDto;
    await http()
      .patch(`/admin/categories/${category.id}`)
      .set('If-Match', `"${c.version}"`)
      .send({ name: 'Graphics boards' })
      .expect(200);
    expect(await matches(p.id, 'board')).toBe(true);
    expect(await matches(p.id, 'video')).toBe(false);
  });

  it('is written for every product the data generator loads', async () => {
    await output(generate({ seed: 'search', products: 500, zipf: 1.1 }), {
      databaseUrl: database.ownerUrl,
      reset: true,
    });
    const { rows } = await owner.query<{ empty: number; total: number }>(
      `select count(*) filter (where search = ''::tsvector)::int as empty, count(*)::int as total from product`,
    );
    expect(rows[0]).toEqual({ empty: 0, total: 500 });
  });
});
