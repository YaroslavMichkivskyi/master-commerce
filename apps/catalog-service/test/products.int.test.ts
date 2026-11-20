import 'reflect-metadata';
import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import {
  type BrandDto,
  type CategoryDetailDto,
  type ProductDto,
  type ProductPageDto,
} from '@master-commerce/dto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

interface Problem {
  detail?: string;
  instance?: string;
  errors?: { field: string; messages: string[] }[];
}

// The products admin API over HTTP, as the service's own role (FR-020…FR-025, FR-030,
// FR-033, FR-034, US-2, US-3). Everything is set up through the API itself.
describe('admin: products', () => {
  let database: CatalogDatabase;
  let app: INestApplication;
  let asus: BrandDto;
  let gpus: CategoryDetailDto;
  let components: CategoryDetailDto;

  const http = () => request(app.getHttpServer() as Server);
  const ifMatch = (e: { version: number }) => `"${e.version}"`;
  const SPECS = { chipset: 'GeForce RTX 4060', memory_size: 8, memory_type: 'GDDR6' };
  const input = (n: string, over: object = {}) => ({
    name: `GPU ${n}`,
    slug: `gpu-${n}`,
    sku: `GPU-${n.toUpperCase()}`,
    brandId: asus.id,
    categoryId: gpus.id,
    priceCents: 32999,
    stock: 12,
    specs: SPECS,
    ...over,
  });
  const create = async (n: string, over: object = {}) =>
    (await http().post('/admin/products').send(input(n, over)).expect(201)).body as ProductDto;
  const patch = (p: ProductDto, body: object) =>
    http().patch(`/admin/products/${p.id}`).set('If-Match', ifMatch(p)).send(body);

  beforeAll(async () => {
    database = await startCatalogDatabase();
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.init();

    asus = (await http().post('/admin/brands').send({ name: 'ASUS', slug: 'asus' }).expect(201))
      .body as BrandDto;
    components = (
      await http().post('/admin/categories').send({ name: 'Components', slug: 'components' })
    ).body as CategoryDetailDto;
    const leaf = (
      await http()
        .post('/admin/categories')
        .send({ name: 'Graphics cards', slug: 'gpus', parentId: components.id })
        .expect(201)
    ).body as CategoryDetailDto;
    // Inherited: every component has an optional warranty.
    await http()
      .put(`/admin/categories/${components.id}/attributes`)
      .set('If-Match', ifMatch(components))
      .send({
        attributes: [
          { code: 'warranty_months', name: 'Warranty', type: 'number', required: false },
        ],
      })
      .expect(200);
    gpus = (
      await http()
        .put(`/admin/categories/${leaf.id}/attributes`)
        .set('If-Match', ifMatch(leaf))
        .send({
          attributes: [
            {
              code: 'chipset',
              name: 'Chipset',
              type: 'text',
              required: true,
              maxLength: 50,
              sortOrder: 10,
            },
            {
              code: 'memory_size',
              name: 'Memory size',
              type: 'number',
              required: true,
              unit: 'GB',
              minValue: 1,
              maxValue: 64,
              wholeNumbers: true,
              sortOrder: 20,
            },
            {
              code: 'memory_type',
              name: 'Memory type',
              type: 'select',
              required: true,
              allowedValues: ['GDDR6', 'GDDR6X', 'GDDR7'],
              sortOrder: 30,
            },
          ],
        })
        .expect(200)
    ).body as CategoryDetailDto;
  });

  afterAll(async () => {
    await app?.close();
    await database?.container.stop();
  });

  it('creates a product with valid specs, unpublished, with its ETag (US-2)', async () => {
    const res = await http()
      .post('/admin/products')
      .send(input('4060', { specs: { ...SPECS, warranty_months: 36 }, name: ' GPU 4060 ' }))
      .expect(201);
    expect(res.body).toMatchObject({
      name: 'GPU 4060',
      priceCents: 32999,
      stock: 12,
      description: '',
      specs: { ...SPECS, warranty_months: 36 },
      published: false,
      version: 1,
    });
    expect(res.headers.etag).toBe('"1"');
  });

  it('names every offending attribute in one 400, storing nothing (US-3)', async () => {
    const res = await http()
      .post('/admin/products')
      .send(
        input('bad', {
          specs: { chipset: 'AD107', memory_size: 8.5, memory_type: 'HBM', colour: 'black' },
        }),
      )
      .expect(400);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request is invalid',
      instance: '/admin/products',
      errors: [
        {
          field: 'specs.memory_size',
          messages: ['memory_size must be a whole number from 1 to 64'],
        },
        {
          field: 'specs.memory_type',
          messages: ['memory_type must be one of GDDR6, GDDR6X, GDDR7'],
        },
        { field: 'specs.colour', messages: ['colour is not an attribute of Graphics cards'] },
      ],
    });
    await http().get('/admin/products/by-slug/gpu-bad').expect(404);
  });

  it('refuses a missing brand or category (404) and a category with children (409)', async () => {
    const nobody = '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60';
    await http()
      .post('/admin/products')
      .send(input('x1', { brandId: nobody }))
      .expect(404);
    await http()
      .post('/admin/products')
      .send(input('x2', { categoryId: nobody }))
      .expect(404);
    const res = await http()
      .post('/admin/products')
      .send(input('x3', { categoryId: components.id, specs: {} }))
      .expect(409);
    expect((res.body as Problem).detail).toBe(
      'Components has subcategories; products go into categories without them',
    );
  });

  it('refuses a price of zero, a negative stock and a lowercase SKU (400)', async () => {
    const res = await http()
      .post('/admin/products')
      .send(input('x4', { priceCents: 0, stock: -1, sku: 'gpu-x4' }))
      .expect(400);
    expect((res.body as Problem).errors?.map((e) => e.field).sort()).toEqual([
      'priceCents',
      'sku',
      'stock',
    ]);
  });

  it('refuses a taken slug or SKU, saying which (409)', async () => {
    const p = await create('dup');
    const slug = await http()
      .post('/admin/products')
      .send(input('other', { slug: p.slug }))
      .expect(409);
    expect((slug.body as Problem).detail).toBe('A product with the slug "gpu-dup" already exists');
    const sku = await http()
      .post('/admin/products')
      .send(input('other', { sku: p.sku }))
      .expect(409);
    expect((sku.body as Problem).detail).toBe('A product with the SKU "GPU-DUP" already exists');
  });

  describe('changes (FR-033)', () => {
    it('changes price and stock, bumping version and update time (US-2)', async () => {
      const p = await create('price');
      const res = await patch(p, { priceCents: 29999, stock: 0 }).expect(200);
      const updated = res.body as ProductDto;
      expect(updated).toMatchObject({ priceCents: 29999, stock: 0, version: 2 });
      expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(p.updatedAt));
      expect(res.headers.etag).toBe('"2"');
    });

    it('checks new specs again, and the old ones against a new category', async () => {
      const p = await create('specs');
      const res = await patch(p, { specs: { ...SPECS, memory_size: 128 } }).expect(400);
      expect((res.body as Problem).errors?.map((e) => e.field)).toEqual(['specs.memory_size']);

      const other = (
        await http()
          .post('/admin/categories')
          .send({ name: 'Cases', slug: 'cases', parentId: components.id })
          .expect(201)
      ).body as CategoryDetailDto;
      const moved = await patch(p, { categoryId: other.id }).expect(400);
      expect((moved.body as Problem).errors?.map((e) => e.field)).toEqual([
        'specs.chipset',
        'specs.memory_size',
        'specs.memory_type',
      ]);
      const ok = await patch(p, { categoryId: other.id, specs: {} }).expect(200);
      expect(ok.body).toMatchObject({ categoryId: other.id, specs: {}, version: 2 });
    });

    it('lets only one of two concurrent updates of one version through (412)', async () => {
      const p = await create('race');
      const results = await Promise.all([patch(p, { stock: 1 }), patch(p, { stock: 2 })]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 412]);
    });

    it.each([
      'name',
      'slug',
      'sku',
      'description',
      'brandId',
      'categoryId',
      'priceCents',
      'stock',
      'specs',
    ])('refuses null for %s (400), changing nothing', async (field) => {
      const p = await create(`null-${field.toLowerCase()}`);
      const res = await patch(p, { [field]: null }).expect(400);
      expect((res.body as Problem).errors?.map((e) => e.field)).toEqual([field]);
      const kept = await http().get(`/admin/products/${p.id}`).expect(200);
      expect((kept.body as ProductDto).version).toBe(1);
    });

    it('refuses null for an optional field on create too (400)', async () => {
      await http()
        .post('/admin/products')
        .send(input('null-create', { description: null, stock: null }))
        .expect(400);
    });

    it('needs If-Match (428) and the current version (412)', async () => {
      const p = await create('match');
      await http().patch(`/admin/products/${p.id}`).send({ stock: 1 }).expect(428);
      await http().post(`/admin/products/${p.id}/publish`).expect(428);
      await patch(p, { stock: 1 }).expect(200);
      await patch(p, { stock: 2 }).expect(412);
    });
  });

  it('publishes and unpublishes', async () => {
    const p = await create('pub');
    const on = (
      await http().post(`/admin/products/${p.id}/publish`).set('If-Match', '"1"').expect(200)
    ).body as ProductDto;
    expect(on).toMatchObject({ published: true, version: 2 });
    const off = await http()
      .post(`/admin/products/${p.id}/unpublish`)
      .set('If-Match', '"2"')
      .expect(200);
    expect(off.body).toMatchObject({ published: false, version: 3 });
  });

  it('keeps an old slug finding the product (FR-025)', async () => {
    const p = await create('old');
    await patch(p, { slug: 'gpu-new' }).expect(200);
    const res = await http().get('/admin/products/by-slug/gpu-old').expect(200);
    expect(res.body).toMatchObject({ id: p.id, slug: 'gpu-new' });
    await http()
      .post('/admin/products')
      .send(input('x5', { slug: 'gpu-old' }))
      .expect(409);
  });

  describe('delete and restore (FR-030)', () => {
    it('hides a deleted product, frees its SKU, and restores it while it is free', async () => {
      const p = await create('del');
      await http().delete(`/admin/products/${p.id}`).set('If-Match', '"1"').expect(204);
      await http().get(`/admin/products/${p.id}`).expect(404);
      const res = await http()
        .post(`/admin/products/${p.id}/restore`)
        .set('If-Match', '"2"')
        .expect(200);
      expect(res.body).toMatchObject({ sku: 'GPU-DEL', version: 3 });

      await http().delete(`/admin/products/${p.id}`).set('If-Match', '"3"').expect(204);
      await create('del2', { sku: 'GPU-DEL' });
      const taken = await http()
        .post(`/admin/products/${p.id}/restore`)
        .set('If-Match', '"4"')
        .expect(409);
      expect((taken.body as Problem).detail).toMatch(/^Another product has taken its SKU/);
    });

    it('refuses to restore when its brand is deleted, or its specs no longer fit', async () => {
      const brand = (
        await http().post('/admin/brands').send({ name: 'Gone', slug: 'gone' }).expect(201)
      ).body as BrandDto;
      const p = await create('orphan', { brandId: brand.id });
      await http().delete(`/admin/products/${p.id}`).set('If-Match', '"1"').expect(204);
      await http().delete(`/admin/brands/${brand.id}`).set('If-Match', '"1"').expect(204);
      const res = await http()
        .post(`/admin/products/${p.id}/restore`)
        .set('If-Match', '"2"')
        .expect(409);
      expect((res.body as Problem).detail).toBe(`Brand ${brand.id} is deleted; restore it first`);

      // A leaf of its own gets a required attribute while its only product is deleted.
      const coolers = (
        await http()
          .post('/admin/categories')
          .send({ name: 'Coolers', slug: 'coolers', parentId: components.id })
          .expect(201)
      ).body as CategoryDetailDto;
      const q = await create('stale', { categoryId: coolers.id, specs: {} });
      await http().delete(`/admin/products/${q.id}`).set('If-Match', '"1"').expect(204);
      await http()
        .put(`/admin/categories/${coolers.id}/attributes`)
        .set('If-Match', ifMatch(coolers))
        .send({ attributes: [{ code: 'fans', name: 'Fans', type: 'number', required: true }] })
        .expect(200);
      const stale = await http()
        .post(`/admin/products/${q.id}/restore`)
        .set('If-Match', '"2"')
        .expect(409);
      expect((stale.body as Problem).detail).toBe(
        'Its specs no longer fit the attributes of Coolers: fans is required',
      );
      await http().get(`/admin/products/${q.id}`).expect(404);
    });
  });

  it('lists live products filtered and paged (FR-024, FR-034)', async () => {
    const published = await create('listed');
    await http().post(`/admin/products/${published.id}/publish`).set('If-Match', '"1"').expect(200);

    const all: ProductDto[] = [];
    let cursor: string | null = null;
    do {
      const res = await http()
        .get('/admin/products')
        .query({ limit: 2, categoryId: gpus.id, ...(cursor ? { cursor } : {}) })
        .expect(200);
      const page = res.body as ProductPageDto;
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    expect(all.every((p) => p.categoryId === gpus.id)).toBe(true);
    expect(all.map((p) => p.id)).toEqual(all.map((p) => p.id).sort());
    expect(all.map((p) => p.slug)).not.toContain('gpu-del');

    const pub = (await http().get('/admin/products').query({ published: 'true' }).expect(200))
      .body as ProductPageDto;
    expect(pub.items.map((p) => p.id)).toEqual([published.id]);
    await http().get('/admin/products').query({ published: 'yes' }).expect(400);
    await http().get('/admin/products').query({ brandId: asus.id }).expect(200);
  });
});
