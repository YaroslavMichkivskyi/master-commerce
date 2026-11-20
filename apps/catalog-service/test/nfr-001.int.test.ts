import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { type CategoryDetailDto, type ProductDto } from '@master-commerce/dto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

// NFR-001 (research R-14): creating or updating a product with specs answers within
// 50 ms at the median with 100 000 products in the catalog. On demand only:
//   NFR_001=1 pnpm --filter catalog-service exec vitest run test/nfr-001.int.test.ts
const PRODUCTS = 100_000;
const SAMPLES = 200;
const LIMIT_MS = 50;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95)]!;

describe.skipIf(!process.env.NFR_001)('NFR-001: product writes with 100 000 products', () => {
  let database: CatalogDatabase;
  let app: INestApplication;
  let base: string;
  let brandId: string;
  let categoryId: string;

  const call = async (method: string, path: string, body: object, ifMatch?: string) => {
    const started = performance.now();
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(ifMatch ? { 'if-match': ifMatch } : {}) },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ProductDto;
    const ms = performance.now() - started;
    expect(res.status).toBeLessThan(300);
    return { ms, json };
  };
  const specs = (i: number) => ({
    chipset: `AD10${i % 10}`,
    memory_size: 4 + (i % 4) * 4,
    memory_type: ['GDDR6', 'GDDR6X', 'GDDR7'][i % 3],
    ray_tracing: i % 2 === 0,
  });

  beforeAll(async () => {
    database = await startCatalogDatabase();
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();

    const leaf = (await (
      await fetch(`${base}/admin/categories/by-slug/graphics-cards`)
    ).json()) as CategoryDetailDto;
    categoryId = leaf.id;
    const put = await fetch(`${base}/admin/categories/${categoryId}/attributes`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'if-match': '"1"' },
      body: JSON.stringify({
        attributes: [
          { code: 'chipset', name: 'Chipset', type: 'text', required: true, maxLength: 50 },
          {
            code: 'memory_size',
            name: 'Memory size',
            type: 'number',
            required: true,
            minValue: 1,
            maxValue: 64,
            wholeNumbers: true,
          },
          {
            code: 'memory_type',
            name: 'Memory type',
            type: 'select',
            required: true,
            allowedValues: ['GDDR6', 'GDDR6X', 'GDDR7'],
          },
          { code: 'ray_tracing', name: 'Ray tracing', type: 'boolean', required: false },
        ],
      }),
    });
    expect(put.status).toBe(200);

    const owner = new pg.Client({ connectionString: database.ownerUrl });
    await owner.connect();
    try {
      const { rows } = await owner.query<{ id: string }>(
        "insert into brand(name, slug) values ('Bench', 'bench') returning id",
      );
      brandId = rows[0]!.id;
      // The other categories get products too, as a real catalog would have them.
      await owner.query(
        `insert into product(name, slug, sku, brand_id, category_id, price_cents, stock, specs, published)
         select 'Product ' || n, 'product-' || n, 'SKU-' || n, $1,
                case when n % 2 = 0 then $2::uuid
                     else (select id from category where slug = 'storage') end,
                1000 + n % 50000, n % 100,
                case when n % 2 = 0
                     then jsonb_build_object('chipset', 'AD107', 'memory_size', 8,
                                             'memory_type', 'GDDR6', 'ray_tracing', true)
                     else '{}'::jsonb end,
                n % 3 = 0
         from generate_series(1, $3) n`,
        [brandId, categoryId, PRODUCTS],
      );
      await owner.query('analyze');
    } finally {
      await owner.end();
    }
  }, 300_000);

  afterAll(async () => {
    await app?.close();
    await database?.container.stop();
  });

  it(`answers creates and updates within ${LIMIT_MS} ms at the median`, async () => {
    // Warm-up: connections, prepared code paths.
    for (let i = 0; i < 20; i++) {
      await call('POST', '/admin/products', {
        name: `Warm ${i}`,
        slug: `warm-${i}`,
        sku: `WARM-${i}`,
        brandId,
        categoryId,
        priceCents: 100,
        specs: specs(i),
      });
    }

    const creates: number[] = [];
    const created: ProductDto[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const { ms, json } = await call('POST', '/admin/products', {
        name: `Bench GPU ${i}`,
        slug: `bench-gpu-${i}`,
        sku: `BENCH-GPU-${i}`,
        brandId,
        categoryId,
        priceCents: 30000 + i,
        stock: 5,
        specs: specs(i),
      });
      creates.push(ms);
      created.push(json);
    }

    const updates: number[] = [];
    for (const [i, p] of created.entries()) {
      const { ms } = await call(
        'PATCH',
        `/admin/products/${p.id}`,
        { priceCents: 29000 + i, stock: 4, specs: specs(i + 1) },
        `"${p.version}"`,
      );
      updates.push(ms);
    }

    const report = {
      products: PRODUCTS + 20 + SAMPLES,
      create: { median: median(creates), p95: p95(creates) },
      update: { median: median(updates), p95: p95(updates) },
    };
    // stderr: Vitest keeps a passing test's console output to itself.
    process.stderr.write(`NFR-001 ${JSON.stringify(report)}\n`);
    expect(report.create.median).toBeLessThan(LIMIT_MS);
    expect(report.update.median).toBeLessThan(LIMIT_MS);
  }, 300_000);
});
