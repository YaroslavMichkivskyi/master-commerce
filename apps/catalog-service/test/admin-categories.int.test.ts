import 'reflect-metadata';
import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import {
  type CategoryDetailDto,
  type CategoryTreeDto,
  type CategoryTreeNodeDto,
} from '@master-commerce/dto';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

interface Problem {
  detail?: string;
}

// The categories admin API over HTTP, as the service's own role (FR-010…FR-015, FR-025,
// FR-030, FR-033).
describe('admin: categories', () => {
  let database: CatalogDatabase;
  let owner: pg.Client;
  let app: INestApplication;
  let brandId: string;

  const http = () => request(app.getHttpServer() as Server);
  const create = async (slug: string, parentId?: string) =>
    (
      await http()
        .post('/admin/categories')
        .send({ name: slug, slug, ...(parentId ? { parentId } : {}) })
        .expect(201)
    ).body as CategoryDetailDto;
  const patch = (c: CategoryDetailDto, body: object) =>
    http().patch(`/admin/categories/${c.id}`).set('If-Match', `"${c.version}"`).send(body);
  const detail = async (id: string) =>
    (await http().get(`/admin/categories/${id}`).expect(200)).body as CategoryDetailDto;

  /** Attributes and products have their own API in later steps; written as the owner here. */
  const addAttribute = (categoryId: string, code: string, sortOrder = 0) =>
    owner.query(
      `insert into category_attribute(category_id, code, name, type, required, max_length, sort_order)
       values ($1, $2, $2, 'text', false, 50, $3)`,
      [categoryId, code, sortOrder],
    );
  const addProduct = (categoryId: string, slug: string, specs: object = {}) =>
    owner.query(
      `insert into product(name, slug, sku, brand_id, category_id, price_cents, specs)
       values ($1, $1, upper($1), $2, $3, 100, $4)`,
      [slug, brandId, categoryId, JSON.stringify(specs)],
    );

  beforeAll(async () => {
    database = await startCatalogDatabase();
    owner = new pg.Client({ connectionString: database.ownerUrl });
    await owner.connect();
    const { rows } = await owner.query<{ id: string }>(
      "insert into brand(name, slug) values ('Test', 'test') returning id",
    );
    brandId = rows[0]!.id;
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await owner?.end();
    await database?.container.stop();
  });

  it('creates a top-level category and a child, with ETag and trimmed name', async () => {
    const res = await http()
      .post('/admin/categories')
      .send({ name: ' Components ', slug: 'components', sortOrder: 5 })
      .expect(201);
    const top = res.body as CategoryDetailDto;
    expect(top).toMatchObject({
      name: 'Components',
      sortOrder: 5,
      parentId: null,
      version: 1,
      attributes: [],
      inheritedAttributes: [],
    });
    expect(res.headers.etag).toBe('"1"');
    const child = await create('cooling', top.id);
    expect(child.parentId).toBe(top.id);
  });

  it('refuses a missing parent (404) and a parent that holds products (409)', async () => {
    await http()
      .post('/admin/categories')
      .send({ name: 'X', slug: 'orphan', parentId: '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60' })
      .expect(404);
    const leaf = await create('fans');
    await addProduct(leaf.id, 'fan-1');
    const res = await http()
      .post('/admin/categories')
      .send({ name: 'X', slug: 'case-fans', parentId: leaf.id })
      .expect(409);
    expect((res.body as Problem).detail).toMatch(/^The parent category holds 1 product;/);
  });

  it('shows its own attributes and those inherited from every ancestor, root first', async () => {
    const root = await create('pc-parts');
    const mid = await create('video', root.id);
    const leaf = await create('gpus', mid.id);
    await addAttribute(root.id, 'warranty');
    await addAttribute(mid.id, 'outputs');
    await addAttribute(leaf.id, 'memory_type', 20);
    await addAttribute(leaf.id, 'chipset', 10);

    const read = await detail(leaf.id);
    expect(read.attributes.map((a) => a.code)).toEqual(['chipset', 'memory_type']);
    expect(read.inheritedAttributes.map((a) => a.code)).toEqual(['warranty', 'outputs']);
    expect(read.attributes[0]).toEqual({
      code: 'chipset',
      name: 'chipset',
      type: 'text',
      required: false,
      sortOrder: 10,
      maxLength: 50,
    });
  });

  it('returns the whole live tree, nested, each level in display order', async () => {
    const res = await http().get('/admin/categories/tree').expect(200);
    expect(res.headers.etag).toBeUndefined();
    const { items } = res.body as CategoryTreeDto;
    const find = (nodes: CategoryTreeNodeDto[], slug: string): CategoryTreeNodeDto | undefined =>
      nodes.find((n) => n.slug === slug) ?? nodes.map((n) => find(n.children, slug)).find(Boolean);

    const orders = items.map((n) => n.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(items.map((n) => n.slug)).toEqual(expect.arrayContaining(['cpus', 'components']));
    expect(items.map((n) => n.slug)).not.toContain('cooling');
    expect(find(items, 'components')?.children.map((n) => n.slug)).toEqual(['cooling']);
    const video = find(items, 'video');
    expect(video?.children.map((n) => n.slug)).toEqual(['gpus']);
    expect(video?.attributes.map((a) => a.code)).toEqual(['outputs']);
  });

  describe('moves (FR-010)', () => {
    it('moves a category under another one and back to the top', async () => {
      const a = await create('move-a');
      const b = await create('move-b');
      const moved = (await patch(b, { parentId: a.id }).expect(200)).body as CategoryDetailDto;
      expect(moved).toMatchObject({ parentId: a.id, version: 2 });
      const back = (await patch(moved, { parentId: null }).expect(200)).body as CategoryDetailDto;
      expect(back).toMatchObject({ parentId: null, version: 3 });
    });

    it('refuses a cycle: under itself or under its own descendant (409)', async () => {
      const a = await create('cycle-a');
      const b = await create('cycle-b', a.id);
      const c = await create('cycle-c', b.id);
      await patch(a, { parentId: a.id }).expect(409);
      const res = await patch(a, { parentId: c.id }).expect(409);
      expect((res.body as Problem).detail).toBe(
        'A category cannot move under itself or its subcategories',
      );
      expect((await detail(a.id)).parentId).toBeNull();
    });

    it('refuses a new parent that holds products (409) and a missing one (404)', async () => {
      const leaf = await create('move-leaf');
      await addProduct(leaf.id, 'move-product');
      const c = await create('move-c');
      await patch(c, { parentId: leaf.id }).expect(409);
      await patch(c, { parentId: '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60' }).expect(404);
    });

    it('lets only one of two crossing moves through, without a deadlock', async () => {
      const a = await create('cross-a');
      const b = await create('cross-b');
      const results = await Promise.all([
        patch(b, { parentId: a.id }),
        patch(a, { parentId: b.id }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });
  });

  describe('slugs (FR-025)', () => {
    it('finds a category by a former slug, answering with the current one', async () => {
      const c = await create('hdd');
      await patch(c, { slug: 'hard-drives' }).expect(200);
      const res = await http().get('/admin/categories/by-slug/hdd').expect(200);
      expect(res.body).toMatchObject({ id: c.id, slug: 'hard-drives', version: 2 });
      await http().post('/admin/categories').send({ name: 'X', slug: 'hdd' }).expect(409);
      await http().post('/admin/categories').send({ name: 'X', slug: 'cpus' }).expect(409);
    });
  });

  describe('delete and restore (FR-030)', () => {
    it('refuses to delete a category with subcategories or products (409)', async () => {
      const parent = await create('del-parent');
      const child = await create('del-child', parent.id);
      const res = await http()
        .delete(`/admin/categories/${parent.id}`)
        .set('If-Match', '"1"')
        .expect(409);
      expect((res.body as Problem).detail).toBe(
        'The category has 1 subcategory; move or delete them first',
      );
      await addProduct(child.id, 'del-product-1');
      await addProduct(child.id, 'del-product-2');
      const products = await http()
        .delete(`/admin/categories/${child.id}`)
        .set('If-Match', '"1"')
        .expect(409);
      expect((products.body as Problem).detail).toBe('2 products are in this category');
      expect((await detail(child.id)).version).toBe(1);
    });

    it('hides a deleted category everywhere and restores it', async () => {
      const parent = await create('restore-parent');
      const child = await create('restore-child', parent.id);
      await http().delete(`/admin/categories/${child.id}`).set('If-Match', '"1"').expect(204);
      await http().get(`/admin/categories/${child.id}`).expect(404);
      const { items } = (await http().get('/categories').expect(200)).body as {
        items: { slug: string }[];
      };
      expect(items.map((c) => c.slug)).not.toContain('restore-child');

      const res = await http()
        .post(`/admin/categories/${child.id}/restore`)
        .set('If-Match', '"2"')
        .expect(200);
      expect(res.body).toMatchObject({ slug: 'restore-child', parentId: parent.id, version: 3 });
    });

    it('refuses to restore under a deleted parent or one that now holds products', async () => {
      const parent = await create('gone-parent');
      const child = await create('gone-child', parent.id);
      await http().delete(`/admin/categories/${child.id}`).set('If-Match', '"1"').expect(204);
      await http().delete(`/admin/categories/${parent.id}`).set('If-Match', '"1"').expect(204);
      const res = await http()
        .post(`/admin/categories/${child.id}/restore`)
        .set('If-Match', '"2"')
        .expect(409);
      expect((res.body as Problem).detail).toBe(
        'Its parent category is deleted; restore that first',
      );

      await http()
        .post(`/admin/categories/${parent.id}/restore`)
        .set('If-Match', '"2"')
        .expect(200);
      await addProduct(parent.id, 'gone-product');
      await http().post(`/admin/categories/${child.id}/restore`).set('If-Match', '"2"').expect(409);
    });
  });

  describe('attributes (FR-011, FR-013, FR-015)', () => {
    const put = (c: { id: string; version: number }, attributes: object[]) =>
      http()
        .put(`/admin/categories/${c.id}/attributes`)
        .set('If-Match', `"${c.version}"`)
        .send({ attributes });
    const memory = {
      code: 'memory_size',
      name: ' Memory size ',
      type: 'number',
      required: true,
      unit: 'GB',
      minValue: 1,
      maxValue: 64,
      wholeNumbers: true,
      sortOrder: 20,
    };
    const chipset = {
      code: 'chipset',
      name: 'Chipset',
      type: 'text',
      required: true,
      maxLength: 50,
    };

    it('replaces the set, bumping the category version (US-1)', async () => {
      const c = await create('attr-gpus');
      const res = await put(c, [memory, chipset]).expect(200);
      const body = res.body as CategoryDetailDto;
      expect(body.version).toBe(2);
      expect(res.headers.etag).toBe('"2"');
      expect(body.attributes).toEqual([
        {
          code: 'chipset',
          name: 'Chipset',
          type: 'text',
          required: true,
          sortOrder: 0,
          maxLength: 50,
        },
        { ...memory, name: 'Memory size' },
      ]);

      const again = (await put(body, [chipset]).expect(200)).body as CategoryDetailDto;
      expect(again.attributes.map((a) => a.code)).toEqual(['chipset']);
      await put(c, [chipset]).expect(412);
      await http().put(`/admin/categories/${c.id}/attributes`).send({ attributes: [] }).expect(428);
    });

    it('keeps the row of a code that stays, and soft-deletes the dropped one', async () => {
      const c = await create('attr-rows');
      const first = (await put(c, [memory, chipset]).expect(200)).body as CategoryDetailDto;
      const before = await owner.query<{ id: string; code: string }>(
        'select id, code from category_attribute where category_id = $1',
        [c.id],
      );
      await put(first, [{ ...memory, maxValue: 128 }]).expect(200);
      const after = await owner.query<{
        id: string;
        code: string;
        deleted: boolean;
        version: number;
      }>(
        `select id, code, deleted_at is not null as deleted, version
         from category_attribute where category_id = $1 order by code`,
        [c.id],
      );
      expect(after.rows).toEqual([
        expect.objectContaining({ code: 'chipset', deleted: true }),
        expect.objectContaining({
          code: 'memory_size',
          deleted: false,
          version: 2,
          id: before.rows.find((r) => r.code === 'memory_size')?.id,
        }),
      ]);
    });

    it('refuses limits a type does not take, naming the field (400)', async () => {
      const c = await create('attr-bad');
      const res = await put(c, [{ ...chipset, type: 'select' }]).expect(400);
      expect((res.body as { errors: { field: string }[] }).errors.map((e) => e.field)).toEqual([
        'attributes.0.allowedValues',
        'attributes.0.maxLength',
      ]);
      expect((await detail(c.id)).version).toBe(1);
    });

    it('refuses a code an ancestor or a subcategory already has (409)', async () => {
      const root = await create('attr-root');
      const child = await create('attr-child', root.id);
      await addAttribute(root.id, 'warranty');
      await addAttribute(child.id, 'tdp');
      const warranty = { code: 'warranty', name: 'W', type: 'boolean', required: false };
      const tdp = { code: 'tdp', name: 'T', type: 'boolean', required: false };
      const up = (await put(child, [warranty]).expect(409)).body as Problem;
      expect(up.detail).toBe('Attribute codes would repeat along a category path: warranty');
      await put(await detail(root.id), [warranty, tdp]).expect(409);
    });

    it('refuses a change that stored products would fail, with their number (409)', async () => {
      const c = await create('attr-products');
      const set = (await put(c, [memory]).expect(200)).body as CategoryDetailDto;
      await addProduct(c.id, 'gpu-8', { memory_size: 8 });
      await addProduct(c.id, 'gpu-96', { memory_size: 96 });
      const res = await put(set, [{ ...memory, maxValue: 64 }, chipset]).expect(409);
      expect((res.body as Problem).detail).toBe('2 products would have invalid specs');
      // Allowed: optional new attribute, a wider range.
      await put(set, [
        { ...memory, maxValue: 128 },
        { ...chipset, required: false },
      ]).expect(200);
    });

    it('checks the products of a subtree against a move to a new parent', async () => {
      const strict = await create('move-strict');
      await put(strict, [memory]).expect(200);
      const loose = await create('move-loose');
      await addProduct(loose.id, 'loose-gpu', { chipset: 'AD107' });
      const res = await patch(loose, { parentId: strict.id }).expect(409);
      expect((res.body as Problem).detail).toBe('1 product would have invalid specs');
      expect((await detail(loose.id)).parentId).toBeNull();
    });
  });

  it('needs If-Match on every change (FR-033)', async () => {
    const c = await create('versioned-category');
    await http().patch(`/admin/categories/${c.id}`).send({ name: 'Y' }).expect(428);
    await http().delete(`/admin/categories/${c.id}`).expect(428);
    await http().post(`/admin/categories/${c.id}/restore`).expect(428);
    await http().patch(`/admin/categories/${c.id}`).set('If-Match', '"9"').send({}).expect(412);
  });
});
