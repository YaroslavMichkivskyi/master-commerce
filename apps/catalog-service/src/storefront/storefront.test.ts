import { BadRequestException } from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { type ListFilters, parseFilters, type StorefrontAttribute } from './filters.js';
import { listStatement, type ListQuery } from './list-query.js';
import { searchQuery } from './search-query.js';

// The storefront's query building blocks (TASK-6 FR-002…FR-005, FR-010, R-2, R-7, R-9a).

const ATTRIBUTES: StorefrontAttribute[] = [
  { code: 'memory_type', name: 'Memory type', type: 'select', unit: null },
  { code: 'outputs', name: 'Outputs', type: 'multi_select', unit: null },
  { code: 'memory_size', name: 'Memory size', type: 'number', unit: 'GB' },
  { code: 'ray_tracing', name: 'Ray tracing', type: 'boolean', unit: null },
  { code: 'chipset', name: 'Chipset', type: 'text', unit: null },
  { code: 'sort', name: 'A code that clashes', type: 'select', unit: null },
];
const category = { search: false, categoryFilter: false };
const search = { search: true, categoryFilter: true };

/** The fields a 400 names. */
function failing(query: Record<string, unknown>, options = category): string[] {
  try {
    parseFilters(query, ATTRIBUTES, options);
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const body = (error as BadRequestException).getResponse() as { errors: { field: string }[] };
    return body.errors.map((e) => e.field);
  }
  return [];
}

describe('parseFilters (FR-002, R-7, R-9a)', () => {
  it('reads every kind of filter, the sort and the page', () => {
    const f = parseFilters(
      {
        brand: 'asus,msi',
        price: '199.99-500',
        stock: 'in',
        sort: 'price-asc',
        page: '3',
        memory_type: 'GDDR6,GDDR7',
        outputs: ['HDMI 2.1', 'USB-C'],
        memory_size: '12-',
        ray_tracing: 'true',
      },
      ATTRIBUTES,
      category,
    );
    expect(f).toMatchObject({
      brands: ['asus', 'msi'],
      price: { min: 19999, max: 50000 },
      inStock: true,
      sort: 'price-asc',
      page: 3,
    });
    expect(f.attributes.map((a) => [a.attribute.code, a.kind])).toEqual([
      ['memory_type', 'values'],
      ['outputs', 'values'],
      ['memory_size', 'range'],
      ['ray_tracing', 'values'],
    ]);
    expect(f.attributes.find((a) => a.attribute.code === 'memory_size')).toMatchObject({ min: 12 });
    expect(f.attributes.find((a) => a.attribute.code === 'outputs')).toMatchObject({
      values: ['HDMI 2.1', 'USB-C'],
    });
  });

  it('has defaults, and ignores unknown parameters, text attributes and empty values', () => {
    const f = parseFilters(
      { colour: 'red', chipset: 'AD107', memory_type: ' , ' },
      ATTRIBUTES,
      category,
    );
    expect(f).toEqual({
      brands: [],
      price: {},
      inStock: false,
      category: undefined,
      attributes: [],
      sort: 'new',
      page: 1,
    });
    expect(parseFilters({}, ATTRIBUTES, search).sort).toBe('relevance');
  });

  it('lets a reserved name win over an attribute with the same code', () => {
    const f = parseFilters({ sort: 'name' }, ATTRIBUTES, category);
    expect(f.sort).toBe('name');
    expect(f.attributes).toEqual([]);
  });

  it.each([
    [{ page: '0' }, ['page']],
    [{ page: '101' }, ['page']],
    [{ page: '1; DROP TABLE product' }, ['page']],
    [{ sort: 'relevance' }, ['sort']],
    [{ sort: 'price; DELETE FROM product' }, ['sort']],
    [{ price: 'abc' }, ['price']],
    [{ price: '500-100' }, ['price']],
    [{ price: '-' }, ['price']],
    [{ stock: 'yes' }, ['stock']],
    [{ brand: "asus' OR 1=1 --" }, ['brand']],
    [{ memory_size: '8-x' }, ['memory_size']],
    [{ memory_size: '16-8' }, ['memory_size']],
    [{ ray_tracing: 'maybe' }, ['ray_tracing']],
    [{ memory_type: 'x'.repeat(101) }, ['memory_type']],
    [{ memory_type: Array.from({ length: 51 }, (_, i) => `v${i}`).join(',') }, ['memory_type']],
    [{ page: 'x', price: 'y', stock: 'z' }, ['price', 'stock', 'page']],
    [{ brand: { $ne: 'x' } }, ['brand']],
  ])('answers 400 for %j', (query, fields) => {
    expect(failing(query)).toEqual(fields);
  });

  it('reads the category of a search or brand list, as a slug only', () => {
    expect(parseFilters({ category: 'gpus' }, ATTRIBUTES, search).category).toBe('gpus');
    expect(parseFilters({ category: 'gpus' }, ATTRIBUTES, category).category).toBeUndefined();
    expect(failing({ category: '../admin' }, search)).toEqual(['category']);
  });
});

describe('searchQuery (FR-010, R-9a)', () => {
  it('keeps words, lowercased, the last one a prefix', () => {
    expect(searchQuery('RTX 60')).toEqual({ words: ['rtx', '60'], tsquery: 'rtx & 60:*' });
    expect(searchQuery('Grafikkarte für Spiele').tsquery).toBe('grafikkarte & für & spiele:*');
  });

  it.each([
    ["rtx' & !asus | (x <-> y):* --", 'rtx & asus & x & y:*'],
    ['a:b&c', 'a & b & c:*'],
    ['   rtx   ', 'rtx:*'],
  ])('drops tsquery syntax from %j', (q, tsquery) => {
    expect(searchQuery(q).tsquery).toBe(tsquery);
  });

  it('takes at most 10 words, and refuses an empty or too long query', () => {
    expect(searchQuery('a b c d e f g h i j k l').words).toHaveLength(10);
    expect(() => searchQuery('')).toThrow(BadRequestException);
    expect(() => searchQuery('&&& ---')).toThrow(BadRequestException);
    expect(() => searchQuery(undefined)).toThrow(BadRequestException);
    expect(() => searchQuery('x'.repeat(201))).toThrow(BadRequestException);
  });
});

describe('listStatement (R-2, R-9a)', () => {
  const dialect = new PgDialect();
  const filters = (over: Partial<ListFilters> = {}): ListFilters => ({
    brands: [],
    price: {},
    inStock: false,
    attributes: [],
    sort: 'new',
    page: 1,
    ...over,
  });
  const render = (q: ListQuery) => dialect.sqlToQuery(listStatement(q));
  const INJECTION = "x'); DROP TABLE product; --";

  it('binds every value, attribute codes included, and splices none into the SQL', () => {
    const memoryType = ATTRIBUTES[0]!;
    const { sql, params } = render({
      scope: { kind: 'category', categoryIds: ['0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60'] },
      filters: filters({
        brands: [INJECTION],
        price: { min: 100, max: 200 },
        attributes: [
          { kind: 'values', attribute: { ...memoryType, code: INJECTION }, values: [INJECTION] },
        ],
      }),
      facetAttributes: [{ ...memoryType, code: INJECTION }],
      categoryFacet: false,
    });
    expect(sql).not.toContain('DROP');
    expect(sql).not.toContain(INJECTION);
    expect(params).toContain(INJECTION);
    expect(params).toContainEqual([INJECTION]);
    expect(params).toContain(100);
  });

  it('puts the search query in a parameter, never in the text', () => {
    const { sql, params } = render({
      scope: { kind: 'search', tsquery: 'rtx & 60:*' },
      filters: filters({ sort: 'relevance' }),
      facetAttributes: [],
      categoryFacet: true,
    });
    expect(sql).not.toContain('rtx');
    expect(params).toContain('rtx & 60:*');
    expect(sql).toContain('ts_rank_cd');
    expect(sql).toMatch(/ORDER BY in_stock DESC, rank DESC, id ASC/);
  });

  it.each([
    ['new', 'in_stock DESC, created_at DESC, id DESC'],
    ['price-asc', 'in_stock DESC, price_cents ASC, id ASC'],
    ['price-desc', 'in_stock DESC, price_cents DESC, id ASC'],
    ['name', 'in_stock DESC, name ASC, id ASC'],
  ] as const)('orders %s with out-of-stock products last', (sort, order) => {
    const { sql } = render({
      scope: { kind: 'brand', brandId: '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60' },
      filters: filters({ sort }),
      facetAttributes: [],
      categoryFacet: true,
    });
    expect(sql).toContain(`ORDER BY ${order}`);
  });

  it('computes the offset of the page asked for, bound', () => {
    const { params } = render({
      scope: { kind: 'brand', brandId: '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60' },
      filters: filters({ page: 4 }),
      facetAttributes: [],
      categoryFacet: false,
    });
    expect(params).toContain(72);
  });
});
