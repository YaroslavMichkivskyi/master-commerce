import { describe, expect, it } from 'vitest';
import type { Json } from '../src/csv.js';
import { dataHash, generate, type GenerateOptions } from '../src/generate.js';
import { allowed, leaves, nodes } from './support.js';

// The generated rows (spec FR-001…FR-008, plan D-1…D-6).

const options = (products: number, over: Partial<GenerateOptions> = {}): GenerateOptions => ({
  seed: 'test',
  products,
  zipf: 1.1,
  ...over,
});

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKU = /^[A-Z0-9][A-Z0-9-]*$/;

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  brandId: string;
  categoryId: string;
  priceCents: number;
  stock: number;
  specs: Record<string, unknown>;
  published: boolean;
  createdAt: Date;
}

/** The generated catalog as objects, with the slugs behind the ids. */
function catalog(o: GenerateOptions) {
  const [brand, category, attribute, product] = generate(o);
  const brandSlug = new Map([...brand!.rows()].map((r) => [r[0] as string, r[2] as string]));
  const categorySlug = new Map([...category!.rows()].map((r) => [r[0] as string, r[2] as string]));
  const products: Product[] = [...product!.rows()].map((r) => ({
    id: r[0] as string,
    name: r[1] as string,
    slug: r[2] as string,
    sku: r[3] as string,
    description: r[4] as string,
    brandId: r[5] as string,
    categoryId: r[6] as string,
    priceCents: r[7] as number,
    stock: r[8] as number,
    specs: (r[9] as Json).json as Record<string, unknown>,
    published: r[10] as boolean,
    createdAt: r[11] as Date,
  }));
  return {
    brands: [...brand!.rows()],
    categories: [...category!.rows()],
    attributes: [...attribute!.rows()],
    products,
    brandSlug,
    categorySlug,
  };
}

const big = catalog(options(40_000));
const leafBySlug = new Map(leaves.map((l) => [l.def.slug, l]));

describe('size (FR-002)', () => {
  it.each([1, 1000, 997])('makes exactly %i products, and the whole fixed catalog', (n) => {
    const c = catalog(options(n));
    expect(c.products).toHaveLength(n);
    expect(c.categories).toHaveLength(nodes.length);
    expect(c.attributes).toHaveLength(nodes.reduce((sum, x) => sum + x.def.attributes.length, 0));
    expect(c.brands.length).toBeGreaterThanOrEqual(45);
  });

  it('refuses a scale below 1 or not whole, and a Zipf exponent of 0', () => {
    expect(() => generate(options(0))).toThrow();
    expect(() => generate(options(1.5))).toThrow();
    expect(() => generate(options(10, { zipf: 0 }))).toThrow();
  });
});

describe('determinism (FR-001, AC #1)', () => {
  it('gives equal hashes for equal options and others for another seed or exponent', () => {
    const h = dataHash(options(2000));
    expect(dataHash(options(2000))).toBe(h);
    expect(dataHash(options(2000, { seed: 'other' }))).not.toBe(h);
    expect(dataHash(options(2000, { zipf: 1.2 }))).not.toBe(h);
    expect(dataHash(options(2001))).not.toBe(h);
  });

  it('gives the pinned hash, on every machine (checked on Windows and in CI on Linux)', () => {
    expect(dataHash({ seed: 'demo', products: 1000, zipf: 1.1 })).toBe(
      'a2986c3de90df676b9d0e98716c24536af34df8dba063d0118e9e272e7319906',
    );
  });
});

describe('rows the catalog accepts (FR-005, FR-007, FR-008)', () => {
  it('has unique slugs and SKUs in the formats and lengths of the database', () => {
    const slugs = new Set(big.products.map((p) => p.slug));
    const skus = new Set(big.products.map((p) => p.sku));
    expect(slugs.size).toBe(big.products.length);
    expect(skus.size).toBe(big.products.length);
    for (const p of big.products) {
      expect(p.slug).toMatch(SLUG);
      expect(p.slug.length).toBeLessThanOrEqual(100);
      expect(p.sku).toMatch(SKU);
      expect(p.sku.length).toBeLessThanOrEqual(40);
      expect(p.name.length).toBeLessThanOrEqual(200);
      expect(p.name).toBe(p.name.trim());
      expect(p.description.length).toBeLessThanOrEqual(10_000);
      expect(Number.isInteger(p.priceCents) && p.priceCents > 0 && p.priceCents < 2 ** 31).toBe(
        true,
      );
      expect(Number.isInteger(p.stock) && p.stock >= 0).toBe(true);
    }
  });

  it('makes UUIDv7 ids and times that grow with the row', () => {
    for (let i = 1; i < big.products.length; i++) {
      expect(big.products[i]!.id > big.products[i - 1]!.id).toBe(true);
      expect(big.products[i]!.createdAt.getTime()).toBeGreaterThan(
        big.products[i - 1]!.createdAt.getTime(),
      );
    }
    expect(big.products.every((p) => UUID_V7.test(p.id))).toBe(true);
    const catalogIds = [...big.brands, ...big.categories, ...big.attributes].map(
      (r) => r[0] as string,
    );
    expect(catalogIds.every((id) => UUID_V7.test(id))).toBe(true);
    expect(new Set(catalogIds).size).toBe(catalogIds.length);
  });

  it('puts products in leaves only, with specs valid for the effective attributes', () => {
    for (const p of big.products) {
      const leaf = leafBySlug.get(big.categorySlug.get(p.categoryId)!);
      expect(leaf, p.slug).toBeDefined();
      const codes = new Set(leaf!.path.map((a) => a.code));
      for (const code of Object.keys(p.specs))
        expect(codes.has(code), `${p.slug}: ${code}`).toBe(true);
      for (const a of leaf!.path) {
        const value = p.specs[a.code];
        if (value === undefined) {
          expect(a.required, `${p.slug}: ${a.code} missing`).toBe(false);
          continue;
        }
        expect(allowed(a, value), `${p.slug}: ${a.code} = ${JSON.stringify(value)}`).toBe(true);
      }
      expect(leaf!.def.leaf!.brands).toContain(big.brandSlug.get(p.brandId));
      expect(p.name.startsWith(big.brands.find((b) => b[0] === p.brandId)![1] as string)).toBe(
        true,
      );
    }
  });

  it('leaves optional attributes out of some products', () => {
    const optional = leafBySlug
      .get('graphics-cards')!
      .path.find((a) => a.code === 'recommended_psu_w')!;
    const gpus = big.products.filter(
      (p) => big.categorySlug.get(p.categoryId) === 'graphics-cards',
    );
    const share = gpus.filter((p) => p.specs[optional.code] !== undefined).length / gpus.length;
    expect(share).toBeGreaterThan(0.7);
    expect(share).toBeLessThan(0.9);
  });
});

describe('distributions (FR-005, FR-006, plan D-3)', () => {
  it('fills each leaf in proportion to its weight, exactly', () => {
    const total = leaves.reduce((sum, l) => sum + l.def.leaf!.weight, 0);
    for (const l of leaves) {
      const n = big.products.filter(
        (p) => big.categorySlug.get(p.categoryId) === l.def.slug,
      ).length;
      expect(Math.abs(n - (40_000 * l.def.leaf!.weight) / total)).toBeLessThan(1);
    }
  });

  it('spreads products over brands by Zipf (exponent 1.1) within a leaf', () => {
    const leaf = leafBySlug.get('graphics-cards')!.def.leaf!;
    const ids = new Map([...big.brandSlug].map(([id, slug]) => [slug, id]));
    const gpus = big.products.filter(
      (p) => big.categorySlug.get(p.categoryId) === 'graphics-cards',
    );
    const counts = leaf.brands.map(
      (slug) => gpus.filter((p) => p.brandId === ids.get(slug)).length,
    );
    // Least-squares slope of log(count) over log(rank).
    const xs = counts.map((_, i) => Math.log(i + 1));
    const ys = counts.map((c) => Math.log(c));
    const mx = xs.reduce((a, b) => a + b) / xs.length;
    const my = ys.reduce((a, b) => a + b) / ys.length;
    const slope =
      xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) /
      xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    expect(slope).toBeGreaterThan(-1.25);
    expect(slope).toBeLessThan(-0.95);
    const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)]!;
    expect(counts[0]!).toBeGreaterThan(3 * median);
  });

  it('has some products out of stock and most published', () => {
    const out = big.products.filter((p) => p.stock === 0).length / big.products.length;
    const published = big.products.filter((p) => p.published).length / big.products.length;
    expect(out).toBeGreaterThan(0.06);
    expect(out).toBeLessThan(0.1);
    expect(published).toBeGreaterThan(0.88);
    expect(published).toBeLessThan(0.92);
  });

  it('prices higher specs higher (plan D-6)', () => {
    const gpus = big.products.filter(
      (p) => big.categorySlug.get(p.categoryId) === 'graphics-cards',
    );
    const average = (memory: number) => {
      const xs = gpus.filter((p) => p.specs.memory_size === memory).map((p) => p.priceCents);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(average(8)).toBeLessThan(average(16));
    expect(average(16)).toBeLessThan(average(32));
    expect(big.products.every((p) => p.priceCents % 100 === 99)).toBe(true);
  });
});
