import 'reflect-metadata';
import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import {
  type FacetDto,
  type ProductCardListDto,
  type ProductListPageDto,
  type SitemapDto,
  type SitemapPartDto,
  type StorefrontProductDto,
  type StorefrontTreeDto,
} from '@master-commerce/dto';
import { generate, output } from 'datagen';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

// The storefront API on a generated catalog (TASK-6 FR-001…FR-011, R-9a): every answer
// is checked against a brute-force reading of the same rows.

interface Row {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  stock: number;
  specs: Record<string, unknown>;
  published: boolean;
  createdAt: Date;
}

describe('storefront API', () => {
  let database: CatalogDatabase;
  let owner: pg.Pool;
  let app: INestApplication;
  let rows: Row[];
  let categories: { id: string; slug: string; parentId: string | null }[];

  const http = () => request(app.getHttpServer() as Server);
  const list = async (path: string, query: Record<string, string> = {}) =>
    (await http().get(path).query(query).expect(200)).body as ProductListPageDto;

  const subtree = (slug: string): Set<string> => {
    const root = categories.find((c) => c.slug === slug)!;
    const ids = new Set([root.id]);
    for (let grew = true; grew;) {
      grew = false;
      for (const c of categories) {
        if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    return ids;
  };
  const onSale = () => rows.filter((r) => r.published);

  beforeAll(async () => {
    database = await startCatalogDatabase();
    await output(generate({ seed: 'storefront', products: 2000, zipf: 1.1 }), {
      databaseUrl: database.ownerUrl,
    });
    owner = new pg.Pool({ connectionString: database.ownerUrl });
    const read = await owner.query<{
      id: string;
      slug: string;
      name: string;
      brand: string;
      category_id: string;
      price_cents: number;
      stock: number;
      specs: Record<string, unknown>;
      published: boolean;
      created_at: Date;
    }>(
      `select p.id, p.slug, p.name, b.slug as brand, p.category_id, p.price_cents, p.stock, p.specs,
              p.published, p.created_at
       from product p join brand b on b.id = p.brand_id`,
    );
    rows = read.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      brand: r.brand,
      categoryId: r.category_id,
      price: r.price_cents,
      stock: r.stock,
      specs: r.specs,
      published: r.published,
      createdAt: r.created_at,
    }));
    categories = (
      await owner.query<{ id: string; slug: string; parent_id: string | null }>(
        'select id, slug, parent_id from category',
      )
    ).rows.map((c) => ({ id: c.id, slug: c.slug, parentId: c.parent_id }));
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await owner?.end();
    await database?.container.stop();
  });

  it('answers the tree with the published products of every subtree (FR-001)', async () => {
    const tree = (await http().get('/storefront/categories').expect(200)).body as StorefrontTreeDto;
    const flat = (nodes: StorefrontTreeDto['items']): StorefrontTreeDto['items'] =>
      nodes.flatMap((n) => [n, ...flat(n.children)]);
    for (const node of flat(tree.items)) {
      const ids = subtree(node.slug);
      expect(node.productCount, node.slug).toBe(
        onSale().filter((r) => ids.has(r.categoryId)).length,
      );
    }
    expect(tree.items.map((n) => n.slug)).toContain('components');
  });

  describe('a category list (FR-002…FR-007)', () => {
    it('lists the published products of the subtree, newest first, in stock first, 24 a page', async () => {
      const page = await list('/storefront/categories/graphics-cards/products');
      const scope = onSale().filter((r) => subtree('graphics-cards').has(r.categoryId));
      expect(page.total).toBe(scope.length);
      expect(page.pageSize).toBe(24);
      expect(page.pageCount).toBe(Math.ceil(scope.length / 24));
      const expected = [...scope]
        .sort(
          (a, b) =>
            Number(b.stock > 0) - Number(a.stock > 0) ||
            b.createdAt.getTime() - a.createdAt.getTime() ||
            (a.id < b.id ? 1 : -1),
        )
        .slice(0, 24)
        .map((r) => r.slug);
      expect(page.items.map((i) => i.slug)).toEqual(expected);
      expect(page.category).toMatchObject({
        slug: 'graphics-cards',
        path: [{ slug: 'components', name: 'Components' }],
      });
      expect(page.items[0]!.highlights.map((h) => h.name)).toEqual([
        'Chipset',
        'Memory size',
        'Memory type',
      ]);
      expect(page.items[0]!.highlights[1]!.value).toMatch(/^\d+ GB$/);
    });

    it('counts every facet value with the other filters applied, as brute force does', async () => {
      const query = {
        brand: 'asus,msi,gigabyte',
        memory_type: 'GDDR7',
        memory_size: '12-',
        outputs: 'USB-C,HDMI 2.1',
        stock: 'in',
      };
      const page = await list('/storefront/categories/graphics-cards/products', query);
      const scope = onSale().filter((r) => subtree('graphics-cards').has(r.categoryId));
      const tests: Record<string, (r: Row) => boolean> = {
        brand: (r) => ['asus', 'msi', 'gigabyte'].includes(r.brand),
        memory_type: (r) => r.specs.memory_type === 'GDDR7',
        memory_size: (r) => typeof r.specs.memory_size === 'number' && r.specs.memory_size >= 12,
        outputs: (r) =>
          Array.isArray(r.specs.outputs) &&
          (r.specs.outputs as string[]).some((o) => ['USB-C', 'HDMI 2.1'].includes(o)),
        stock: (r) => r.stock > 0,
      };
      const allBut = (key?: string) => (r: Row) =>
        Object.entries(tests).every(([k, t]) => k === key || t(r));

      expect(page.total).toBe(scope.filter(allBut()).length);
      const facet = (code: string) => page.facets.find((f) => f.code === code)!;
      const countOf = (key: string, value: (r: Row) => unknown[]) => {
        const counts = new Map<string, number>();
        for (const r of scope.filter(allBut(key))) {
          for (const v of value(r)) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
        }
        return counts;
      };
      const expectCounts = (f: FacetDto, counts: Map<string, number>) => {
        for (const v of f.values!)
          expect(v.count, `${f.code}=${v.value}`).toBe(counts.get(v.value) ?? 0);
        for (const [value, n] of counts)
          expect(f.values!.find((v) => v.value === value)?.count).toBe(n);
      };
      expectCounts(
        facet('brand'),
        countOf('brand', (r) => [r.brand]),
      );
      expectCounts(
        facet('memory_type'),
        countOf('memory_type', (r) => [r.specs.memory_type]),
      );
      expectCounts(
        facet('outputs'),
        countOf('outputs', (r) => (r.specs.outputs as string[]) ?? []),
      );
      expectCounts(
        facet('ray_tracing'),
        countOf('ray_tracing', (r) =>
          r.specs.ray_tracing === undefined ? [] : [r.specs.ray_tracing],
        ),
      );
      // Ranges: min / max among the products matching the other filters.
      const sizes = scope.filter(allBut('memory_size')).map((r) => r.specs.memory_size as number);
      expect(facet('memory_size')).toMatchObject({
        kind: 'range',
        unit: 'GB',
        min: Math.min(...sizes),
        max: Math.max(...sizes),
        selected: { min: 12 },
      });
      const prices = scope.filter(allBut()).map((r) => r.price);
      expect(facet('price')).toMatchObject({ min: Math.min(...prices), max: Math.max(...prices) });
      expect(
        facet('brand')
          .values!.filter((v) => v.selected)
          .map((v) => v.value)
          .sort(),
      ).toEqual(['asus', 'gigabyte', 'msi']);
      expect(page.facets.map((f) => f.code)).not.toContain('chipset'); // text: not filterable
    });

    it('filters an inner category by the attributes all its leaves share (FR-006)', async () => {
      const page = await list('/storefront/categories/components/products', {
        warranty_months: '60-',
      });
      const scope = onSale().filter((r) => subtree('components').has(r.categoryId));
      expect(page.total).toBe(
        scope.filter((r) => (r.specs.warranty_months as number) >= 60).length,
      );
      expect(page.facets.map((f) => f.code)).toEqual(['brand', 'price', 'warranty_months']);
      expect(page.category!.children.map((c) => c.slug)).toContain('graphics-cards');
    });

    it.each(['price-asc', 'price-desc', 'name'])(
      'sorts by %s with out-of-stock products last',
      async (sort) => {
        const page = await list('/storefront/categories/ssds/products', { sort });
        const scope = onSale().filter((r) => subtree('ssds').has(r.categoryId));
        const key = (r: Row) => (sort === 'name' ? r.name : r.price);
        const expected = [...scope]
          .sort((a, b) => {
            const stock = Number(b.stock > 0) - Number(a.stock > 0);
            if (stock) return stock;
            const [x, y] = sort === 'price-desc' ? [key(b), key(a)] : [key(a), key(b)];
            return x < y ? -1 : x > y ? 1 : a.id < b.id ? -1 : 1;
          })
          .slice(0, 24);
        expect(page.items.map((i) => i.priceCents)).toEqual(expected.map((r) => r.price));
      },
    );

    it('pages on, answers the last page when asked beyond it or past page 100', async () => {
      const first = await list('/storefront/categories/components/products');
      const second = await list('/storefront/categories/components/products', { page: '2' });
      expect(second.page).toBe(2);
      expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
      const beyond = await list('/storefront/categories/graphics-cards/products', { page: '100' });
      expect(beyond.page).toBe(beyond.pageCount);
      expect(beyond.items.length).toBeGreaterThan(0);
      const past = await list('/storefront/categories/components/products', { page: '101' });
      // Past the limit: page 100, which is then the last page there is.
      expect(past.page).toBe(past.pageCount);
      expect(past.items.length).toBeGreaterThan(0);
      await http()
        .get('/storefront/categories/components/products')
        .query({ page: '0' })
        .expect(400);
      // A price over what the column holds is no upper bound, never a 500.
      const huge = await list('/storefront/categories/components/products', {
        price: '-99999999999',
      });
      expect(huge.total).toBe(first.total);
      expect((await list('/storefront/search', { q: 'rtx', price: '99999999999-' })).total).toBe(0);
    });

    it('ignores brand= on a brand page and counts a selected inner category by its leaves', async () => {
      const brandSlug = rows.find((r) => r.published)!.brand;
      const path = `/storefront/brands/${brandSlug}/products`;
      const all = await list(path);
      expect((await list(path, { brand: 'some-other-brand' })).total).toBe(all.total);

      const inner = categories.find((c) => categories.some((x) => x.parentId === c.id))!;
      const chosen = await list(path, { category: inner.slug });
      const facet = chosen.facets.find((f) => f.code === 'category')!;
      const selected = facet.values!.find((v) => v.value === inner.slug)!;
      expect(selected.selected).toBe(true);
      expect(selected.count).toBe(chosen.total);
    });

    it('answers 404 for an unknown or malformed category', async () => {
      await http().get('/storefront/categories/nothing-here/products').expect(404);
      await http().get('/storefront/categories/..%2Fadmin/products').expect(404);
    });
  });

  describe('search (FR-010, FR-011)', () => {
    it('finds products by all words, the last one partial, ranked, with brand and category facets', async () => {
      const page = await list('/storefront/search', { q: 'GeForce RTX 60' });
      expect(page.query).toBe('geforce rtx 60');
      expect(page.total).toBeGreaterThan(0);
      for (const item of page.items) expect(item.name).toMatch(/GeForce RTX 60\d0/i);
      expect(page.sort).toBe('relevance');
      expect(page.facets.map((f) => f.code)).toEqual(['brand', 'price', 'category']);
    });

    it('finds by brand and category names too, and filters by a category', async () => {
      const page = await list('/storefront/search', { q: 'asus card' });
      expect(page.total).toBeGreaterThan(0);
      const gpus = await list('/storefront/search', { q: 'asus', category: 'graphics-cards' });
      const ids = subtree('graphics-cards');
      expect(gpus.total).toBe(
        onSale().filter((r) => r.brand === 'asus' && ids.has(r.categoryId)).length,
      );
    });

    it('treats query syntax as plain words and refuses an empty query', async () => {
      const page = await list('/storefront/search', { q: "rtx' | !asus & (x:*) --" });
      expect(page.query).toBe('rtx asus x');
      await http().get('/storefront/search').query({ q: '&&&' }).expect(400);
      await http().get('/storefront/search').expect(400);
    });
  });

  describe('a product (FR-008)', () => {
    it('answers a published product with its specs in attribute order', async () => {
      const gpu = onSale().find((r) => subtree('graphics-cards').has(r.categoryId))!;
      const p = (await http().get(`/storefront/products/${gpu.slug}`).expect(200))
        .body as StorefrontProductDto;
      expect(p).toMatchObject({ slug: gpu.slug, priceCents: gpu.price, inStock: gpu.stock > 0 });
      expect(p.category).toMatchObject({ slug: 'graphics-cards', path: [{ slug: 'components' }] });
      expect(p.specs[0]).toMatchObject({ code: 'warranty_months', unit: 'months' });
      expect(p.specs.map((s) => s.code)).toContain('memory_size');
      expect(Object.keys(p)).not.toContain('version');
    });

    it('answers 404 for an unpublished product', async () => {
      const hidden = rows.find((r) => !r.published)!;
      await http().get(`/storefront/products/${hidden.slug}`).expect(404);
    });
  });

  it('answers the newest products and the sitemap', async () => {
    const newest = (await http().get('/storefront/new').query({ limit: '5' }).expect(200))
      .body as ProductCardListDto;
    expect(newest.items).toHaveLength(5);
    const sitemap = (await http().get('/storefront/sitemap').expect(200)).body as SitemapDto;
    expect(sitemap.productParts).toBe(1);
    expect(sitemap.categories.length).toBe(categories.length);
    const part = (await http().get('/storefront/sitemap/products/0').expect(200))
      .body as SitemapPartDto;
    expect(part.items).toHaveLength(onSale().length);
  });

  it('changes nothing for injection attempts in any parameter (R-9a)', async () => {
    const before = await owner.query<{ n: number }>('select count(*)::int as n from product');
    const attempts = ["' OR 1=1 --", "'); DROP TABLE product; --", '1; SELECT pg_sleep(5)'];
    for (const a of attempts) {
      await http().get('/storefront/categories/graphics-cards/products').query({ memory_type: a });
      await http()
        .get('/storefront/categories/graphics-cards/products')
        .query({ brand: a, sort: a, page: a });
      await http().get('/storefront/search').query({ q: a, category: a });
      await http().get('/storefront/categories/graphics-cards/products').query({ memory_size: a });
    }
    const filtered = await list('/storefront/categories/graphics-cards/products', {
      memory_type: "' OR 1=1 --",
    });
    expect(filtered.total).toBe(0);
    const after = await owner.query<{ n: number }>('select count(*)::int as n from product');
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
    // Express 5 parses no nested query: `brand[$ne]` is just an unknown name, ignored.
    const nested = await list('/storefront/categories/graphics-cards/products', {
      'brand[$ne]': 'x',
    });
    expect(nested.total).toBe((await list('/storefront/categories/graphics-cards/products')).total);
  });

  describe('changes of the catalog', () => {
    it('answers an old product, category or brand slug with the current one (FR-008, R-5)', async () => {
      const p = onSale()[0]!;
      await owner.query(
        `insert into former_slug(kind, slug, entity_id) values ('product', 'old-product-slug', $1)`,
        [p.id],
      );
      const read = (await http().get('/storefront/products/old-product-slug').expect(200))
        .body as StorefrontProductDto;
      expect(read.slug).toBe(p.slug);

      const gpus = categories.find((c) => c.slug === 'graphics-cards')!;
      await owner.query(
        `insert into former_slug(kind, slug, entity_id) values ('category', 'video-cards', $1)`,
        [gpus.id],
      );
      expect((await list('/storefront/categories/video-cards/products')).category!.slug).toBe(
        'graphics-cards',
      );

      const { rows: b } = await owner.query<{ id: string }>(
        `select id from brand where slug = 'asus'`,
      );
      await owner.query(
        `insert into former_slug(kind, slug, entity_id) values ('brand', 'asustek', $1)`,
        [b[0]!.id],
      );
      expect((await list('/storefront/brands/asustek/products')).brand!.slug).toBe('asus');
    });

    it('never shows an unpublished or deleted product, nor one of a deleted brand', async () => {
      const scope = () => list('/storefront/brands/zotac/products');
      const before = await scope();
      const [first, second] = before.items;
      await owner.query('update product set published = false where id = $1', [first!.id]);
      await owner.query('update product set deleted_at = now() where id = $1', [second!.id]);
      const after = await scope();
      expect(after.total).toBe(before.total - 2);
      expect(after.items.map((i) => i.id)).not.toContain(first!.id);
      await owner.query(`update brand set deleted_at = now() where slug = 'zotac'`);
      await http().get('/storefront/brands/zotac/products').expect(404);
      const gpus = await list('/storefront/categories/graphics-cards/products', { brand: 'zotac' });
      expect(gpus.total).toBe(0);
    });
  });
});
