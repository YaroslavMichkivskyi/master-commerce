import 'reflect-metadata';
import { type Server } from 'node:http';
import { performance } from 'node:perf_hooks';
import { type INestApplication } from '@nestjs/common';
import { type ProductListPageDto } from '@master-commerce/dto';
import { generate, output } from 'datagen';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from '../test/support/catalog-database.js';

// Speed of the storefront API (TASK-6 NFR-001, NFR-002, AC #1), on demand:
// `pnpm --filter catalog-service test:nfr`. A fresh PostgreSQL 17 (the image of the
// local stack) gets 100 000 generated products (seed "demo", as `pnpm datagen --scale
// 100k`); each request is timed in-process through HTTP, after a warm-up.

const PRODUCTS = Number(process.env.NFR_PRODUCTS ?? 100_000);
const RUNS = Number(process.env.NFR_RUNS ?? 15);
const WARM_UP = 3;
const LIST_P95_MS = 200;
const SEARCH_P95_MS = 300;

const CATEGORIES = ['components', 'graphics-cards', 'ssds', 'laptops', 'monitors'];
const SEARCHES = [
  'rtx',
  'rtx 60',
  'samsung ssd',
  'gaming laptop',
  'asus rog',
  'logitech mouse',
  'ddr5 32',
  'wifi router',
  '27 monitor 144',
  'nvme 2tb',
];

type Query = Record<string, string>;

const p95 = (times: number[]) => {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!;
};
const round = (ms: number) => Math.round(ms * 10) / 10;

describe('storefront speed', () => {
  let database: CatalogDatabase;
  let app: INestApplication;
  let loadSeconds = 0;
  const report: { group: string; requests: number; p50: number; p95: number; max: number }[] = [];
  const perQuery: { query: string; p95: number }[] = [];

  const http = () => request(app.getHttpServer() as Server);
  const get = async (path: string, query: Query) =>
    (await http().get(path).query(query).expect(200)).body as ProductListPageDto;

  /** Every query timed RUNS times after a warm-up; all the times of the group. */
  async function measure(requests: { path: string; query: Query }[]): Promise<number[]> {
    const times: number[] = [];
    for (const r of requests) {
      for (let i = 0; i < WARM_UP; i++) await get(r.path, r.query);
      const own: number[] = [];
      for (let i = 0; i < RUNS; i++) {
        const start = performance.now();
        await get(r.path, r.query);
        own.push(performance.now() - start);
      }
      times.push(...own);
      perQuery.push({
        query: `${r.path}?${new URLSearchParams(r.query).toString()}`,
        p95: round(p95(own)),
      });
    }
    return times;
  }

  function record(group: string, times: number[]) {
    const sorted = [...times].sort((a, b) => a - b);
    report.push({
      group,
      requests: times.length,
      p50: round(sorted[Math.floor(sorted.length / 2)]!),
      p95: round(p95(times)),
      max: round(sorted.at(-1)!),
    });
  }

  beforeAll(async () => {
    database = await startCatalogDatabase();
    const start = performance.now();
    await output(generate({ seed: 'demo', products: PRODUCTS, zipf: 1.1 }), {
      databaseUrl: database.ownerUrl,
    });
    loadSeconds = (performance.now() - start) / 1000;
    process.env.CATALOG_DATABASE_URL = database.appUrl;
    // A log line per request would be timed too.
    process.env.LOG_LEVEL = 'warn';
    app = await createApp();
    await app.init();
  }, 900_000);

  afterAll(async () => {
    console.log(`\n${PRODUCTS} products loaded in ${loadSeconds.toFixed(1)} s (triggers on)`);
    console.table(report);
    console.table(perQuery.sort((a, b) => b.p95 - a.p95).slice(0, 8));
    await app?.close();
    await database?.container.stop();
  });

  it(`answers filtered and sorted category lists within ${LIST_P95_MS} ms at P95 (NFR-001)`, async () => {
    const requests: { path: string; query: Query }[] = [];
    for (const slug of CATEGORIES) {
      const path = `/storefront/categories/${slug}/products`;
      // Filters taken from the category's own facets: its two biggest brands, the
      // biggest value of its first value facet, the middle of the price range.
      const first = await get(path, {});
      const brands = first.facets.find((f) => f.code === 'brand')!.values!;
      const top = [...brands].sort((a, b) => b.count - a.count).map((v) => v.value);
      const values = first.facets.find((f) => f.kind === 'values' && f.code !== 'brand');
      const value = values?.values?.length
        ? { [values.code]: [...values.values].sort((a, b) => b.count - a.count)[0]!.value }
        : {};
      const price = first.facets.find((f) => f.code === 'price')!;
      const low = Math.floor(price.min! / 100);
      const high = Math.ceil(price.max! / 100);
      const mid = `${low + Math.floor((high - low) / 4)}-${low + Math.floor((high - low) / 2)}`;
      requests.push(
        { path, query: {} },
        { path, query: { sort: 'price-asc' } },
        { path, query: { brand: top.slice(0, 2).join(','), sort: 'price-desc' } },
        {
          path,
          query: { brand: top[0]!, ...value, price: mid, stock: 'in', sort: 'name' },
        },
        { path, query: { sort: 'price-asc', page: '40' } },
      );
    }
    const times = await measure(requests);
    record('category lists', times);
    expect(p95(times)).toBeLessThanOrEqual(LIST_P95_MS);
  });

  it(`answers searches within ${SEARCH_P95_MS} ms at P95 (NFR-002)`, async () => {
    const requests = SEARCHES.flatMap((q): { path: string; query: Query }[] => [
      { path: '/storefront/search', query: { q } },
      { path: '/storefront/search', query: { q, sort: 'price-asc', stock: 'in' } },
    ]);
    const times = await measure(requests);
    record('searches', times);
    expect(p95(times)).toBeLessThanOrEqual(SEARCH_P95_MS);
  });
});
