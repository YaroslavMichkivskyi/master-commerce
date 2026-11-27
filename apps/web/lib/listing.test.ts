import type { FacetDto } from '@master-commerce/dto';
import { describe, expect, it } from 'vitest';
import { appliedFilters, clearFiltersHref, GAP, pageNumbers, productCount } from './listing';

const facets: FacetDto[] = [
  {
    code: 'category',
    name: 'Category',
    kind: 'values',
    values: [{ value: 'gpus', label: 'Graphics cards', count: 3, selected: true }],
  },
  {
    code: 'brand',
    name: 'Brand',
    kind: 'values',
    values: [
      { value: 'asus', label: 'ASUS', count: 30, selected: true },
      { value: 'msi', label: 'MSI', count: 20, selected: true },
      { value: 'zotac', label: 'Zotac', count: 5, selected: false },
    ],
  },
  { code: 'price', name: 'Price', kind: 'range', unit: 'EUR cents', min: 19999, max: 199999 },
  { code: 'memory_size', name: 'Memory size', kind: 'range', unit: 'GB', min: 8, max: 32 },
];

describe('page numbers', () => {
  it('none for a single page, all of them up to 7', () => {
    expect(pageNumbers(1, 1)).toEqual([]);
    expect(pageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('first, last and a window of 5 around the current page, gaps between', () => {
    expect(pageNumbers(1, 100)).toEqual([1, 2, 3, 4, 5, 6, GAP, 100]);
    expect(pageNumbers(50, 100)).toEqual([1, GAP, 48, 49, 50, 51, 52, GAP, 100]);
    expect(pageNumbers(100, 100)).toEqual([1, GAP, 95, 96, 97, 98, 99, 100]);
  });

  it('stays short and of a stable size at every page (deep pagination edge case)', () => {
    for (let page = 1; page <= 100; page++) {
      const shown = pageNumbers(page, 100);
      expect(shown.length).toBeGreaterThanOrEqual(8);
      expect(shown.length).toBeLessThanOrEqual(9);
      expect(shown).toContain(page);
    }
  });
});

describe('applied filters', () => {
  const params = {
    category: 'gpus',
    brand: 'asus,msi',
    price: '100-500',
    memory_size: '12-',
    stock: 'in',
    sort: 'price-asc',
    page: '3',
  };
  const applied = appliedFilters('/search', { ...params, q: 'rtx' }, facets);

  it('one chip per applied value, range and "in stock", in facet order', () => {
    expect(applied.map((f) => f.label)).toEqual([
      'In stock only',
      'Category: Graphics cards',
      'Brand: ASUS',
      'Brand: MSI',
      'Price: €100 – €500',
      'Memory size: from 12 GB',
    ]);
  });

  it('each chip removes only its own filter, keeps the search and the sort, from page 1', () => {
    const query = (i: number) => new URLSearchParams(applied[i]!.href.split('?')[1]);
    const msi = query(3);
    expect(msi.get('brand')).toBe('asus');
    expect(msi.get('q')).toBe('rtx');
    expect(msi.get('sort')).toBe('price-asc');
    expect(msi.get('price')).toBe('100-500');
    expect(msi.has('page')).toBe(false);
    expect(query(0).has('stock')).toBe(false);
    expect(query(1).has('category')).toBe(false);
    expect(query(4).has('price')).toBe(false);
    expect(query(4).get('memory_size')).toBe('12-');
  });

  // The catalog marks the values the address selects; without filters none is.
  const unselected = facets.map((f) => ({
    ...f,
    values: f.values?.map((v) => ({ ...v, selected: false })),
  }));

  it('a range with only an upper bound', () => {
    expect(appliedFilters('/c/x', { price: '-300' }, unselected)).toEqual([
      { label: 'Price: up to €300', href: '/c/x' },
    ]);
  });

  it('none without filters (the sort and the page are not filters)', () => {
    expect(appliedFilters('/c/x', { sort: 'name', page: '2' }, unselected)).toEqual([]);
  });

  it('"clear all" drops every filter but keeps the search words and the sort', () => {
    expect(clearFiltersHref('/search', { ...params, q: 'rtx' }, facets)).toBe(
      '/search?q=rtx&sort=price-asc',
    );
  });
});

describe('product count', () => {
  it('in words, with thousands separated', () => {
    expect(productCount(1)).toBe('1 product');
    expect(productCount(0)).toBe('0 products');
    expect(productCount(90002)).toBe('90,002 products');
  });
});
