import 'reflect-metadata';
import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { type BrandDto, type BrandPageDto } from '@master-commerce/dto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

interface Problem {
  status: number;
  detail?: string;
  errors?: { field: string; messages: string[] }[];
}

// The brands admin API over HTTP, as the service's own role (FR-001, FR-002, FR-025,
// FR-030, FR-033, FR-034).
describe('admin: brands', () => {
  let database: CatalogDatabase;
  let app: INestApplication;

  const http = () => request(app.getHttpServer() as Server);
  const create = async (slug: string, name = slug.toUpperCase()) =>
    (await http().post('/admin/brands').send({ name, slug }).expect(201)).body as BrandDto;
  const patch = (b: BrandDto, body: object) =>
    http().patch(`/admin/brands/${b.id}`).set('If-Match', `"${b.version}"`).send(body);

  beforeAll(async () => {
    database = await startCatalogDatabase();
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await database?.container.stop();
  });

  it('creates a brand at version 1 with its ETag, the name trimmed', async () => {
    const res = await http()
      .post('/admin/brands')
      .send({ name: '  ASUS ', slug: 'asus' })
      .expect(201);
    const body = res.body as BrandDto;
    expect(body).toMatchObject({ name: 'ASUS', slug: 'asus', version: 1, createdBy: null });
    expect(res.headers.etag).toBe('"1"');

    const read = await http().get(`/admin/brands/${body.id}`).expect(200);
    expect(read.body).toEqual(body);
    expect(read.headers.etag).toBe('"1"');
  });

  it('refuses invalid input with the fields named (400)', async () => {
    const res = await http()
      .post('/admin/brands')
      .send({ name: '', slug: 'Not A Slug', extra: 1 })
      .expect(400);
    const fields = (res.body as Problem).errors?.map((e) => e.field).sort();
    expect(fields).toEqual(['extra', 'name', 'slug']);
    await http().get('/admin/brands/not-a-uuid').expect(400);
  });

  it('refuses a slug a live brand has (409)', async () => {
    await create('msi');
    await http().post('/admin/brands').send({ name: 'Other', slug: 'msi' }).expect(409);
  });

  it('answers 404 for a brand that does not exist', async () => {
    await http().get('/admin/brands/0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60').expect(404);
    await http().get('/admin/brands/by-slug/nobody').expect(404);
  });

  describe('changes need the version read (FR-033)', () => {
    it('renames with If-Match and sends the new ETag', async () => {
      const b = await create('gigabyte');
      const res = await patch(b, { name: 'Gigabyte' }).expect(200);
      expect(res.body).toMatchObject({ name: 'Gigabyte', slug: 'gigabyte', version: 2 });
      expect(res.headers.etag).toBe('"2"');
    });

    it.each(['name', 'slug'])('refuses null for %s (400)', async (field) => {
      const b = await create(`null-${field}`);
      await patch(b, { [field]: null }).expect(400);
      const kept = await http().get(`/admin/brands/${b.id}`).expect(200);
      expect(kept.body).toMatchObject({ slug: `null-${field}`, version: 1 });
    });

    it('answers 428 without If-Match and 412 for an older version', async () => {
      const b = await create('zotac');
      await http().patch(`/admin/brands/${b.id}`).send({ name: 'Z' }).expect(428);
      await patch(b, { name: 'First' }).expect(200);
      const stale = (await patch(b, { name: 'Second' }).expect(412)).body as Problem;
      expect(stale.detail).toMatch(/version is 2/);
      await http().delete(`/admin/brands/${b.id}`).expect(428);
      await http().delete(`/admin/brands/${b.id}`).set('If-Match', '"1"').expect(412);
    });
  });

  describe('slugs (FR-025)', () => {
    it('keeps the old slug finding the brand after a change', async () => {
      const b = await create('palit');
      await patch(b, { slug: 'palit-microsystems' }).expect(200);
      const res = await http().get('/admin/brands/by-slug/palit').expect(200);
      expect(res.body).toMatchObject({ id: b.id, slug: 'palit-microsystems', version: 2 });
      expect(res.headers.etag).toBe('"2"');
    });

    it('refuses another brand the old slug, also on create (409)', async () => {
      const b = await create('evga');
      await patch(b, { slug: 'evga-corp' }).expect(200);
      await http().post('/admin/brands').send({ name: 'X', slug: 'evga' }).expect(409);
      const other = await create('sapphire');
      await patch(other, { slug: 'evga' }).expect(409);
    });

    it('refuses a slug a live brand has on change, and keeps the row as it was', async () => {
      await create('inno3d');
      const b = await create('pny');
      await patch(b, { slug: 'inno3d' }).expect(409);
      const res = await http().get(`/admin/brands/${b.id}`).expect(200);
      expect(res.body).toMatchObject({ slug: 'pny', version: 1 });
    });
  });

  describe('delete and restore (FR-030)', () => {
    it('hides a deleted brand, frees its slug, and brings it back', async () => {
      const b = await create('xfx');
      await http().delete(`/admin/brands/${b.id}`).set('If-Match', '"1"').expect(204);
      await http().get(`/admin/brands/${b.id}`).expect(404);
      await http().get('/admin/brands/by-slug/xfx').expect(404);

      const res = await http()
        .post(`/admin/brands/${b.id}/restore`)
        .set('If-Match', '"2"')
        .expect(200);
      expect(res.body).toMatchObject({ slug: 'xfx', version: 3 });
      expect(res.headers.etag).toBe('"3"');
      await http().post(`/admin/brands/${b.id}/restore`).set('If-Match', '"3"').expect(404);
    });

    it('refuses to restore when another brand took the slug (409)', async () => {
      const b = await create('biostar');
      await http().delete(`/admin/brands/${b.id}`).set('If-Match', '"1"').expect(204);
      await create('biostar');
      await http().post(`/admin/brands/${b.id}/restore`).set('If-Match', '"2"').expect(409);
    });

    it('refuses to delete a brand live products use, counting them (409)', async () => {
      const b = await create('corsair');
      const owner = new pg.Client({ connectionString: database.ownerUrl });
      await owner.connect();
      try {
        await owner.query(
          `insert into product(name, slug, sku, brand_id, category_id, price_cents)
           select 'SSD ' || n, 'ssd-' || n, 'SSD-' || n, $1, id, 1000
           from category, generate_series(1, 2) n where slug = 'storage'`,
          [b.id],
        );
      } finally {
        await owner.end();
      }
      const res = await http().delete(`/admin/brands/${b.id}`).set('If-Match', '"1"').expect(409);
      expect((res.body as Problem).detail).toBe('2 products use this brand');
      const kept = await http().get(`/admin/brands/${b.id}`).expect(200);
      expect((kept.body as BrandDto).version).toBe(1);
    });
  });

  it('lists live brands in pages with a cursor (FR-034)', async () => {
    const all: BrandDto[] = [];
    let cursor: string | null = null;
    do {
      const res = await http()
        .get('/admin/brands')
        .query({ limit: 3, ...(cursor ? { cursor } : {}) })
        .expect(200);
      expect(res.headers.etag).toBeUndefined();
      const page = res.body as BrandPageDto;
      expect(page.items.length).toBeLessThanOrEqual(3);
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    const ids = all.map((b) => b.id);
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(all.map((b) => b.slug)).toContain('asus');
    await http().get('/admin/brands').query({ limit: 0 }).expect(400);
    await http().get('/admin/brands').query({ limit: 201 }).expect(400);
  });
});
