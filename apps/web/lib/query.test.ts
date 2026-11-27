import { describe, expect, it } from 'vitest';
import {
  euros,
  flatten,
  href,
  isFiltered,
  normaliseRanges,
  withoutRefused,
  pageHref,
  rangeOf,
  toggle,
} from './query';

// Addresses of the storefront (TASK-6 FR-031, research R-7).

describe('addresses', () => {
  const params = { brand: 'asus', memory_type: ['GDDR6', 'GDDR7'], page: '3', empty: '' };

  it('flattens repeated names into a comma list and drops empty ones', () => {
    expect(flatten(params)).toEqual({ brand: 'asus', memory_type: 'GDDR6,GDDR7', page: '3' });
  });

  it('applies a change, keeps the rest in a fixed order, and resets the page', () => {
    expect(href('/c/gpus', params, { sort: 'price-asc' })).toBe(
      '/c/gpus?brand=asus&memory_type=GDDR6%2CGDDR7&sort=price-asc',
    );
    expect(href('/c/gpus', params, { brand: undefined })).toBe('/c/gpus?memory_type=GDDR6%2CGDDR7');
    expect(href('/c/gpus', {}, {})).toBe('/c/gpus');
  });

  it('builds page links that keep every filter; page 1 has no number', () => {
    expect(pageHref('/c/gpus', params, 4)).toBe(
      '/c/gpus?brand=asus&memory_type=GDDR6%2CGDDR7&page=4',
    );
    expect(pageHref('/c/gpus', params, 1)).toBe('/c/gpus?brand=asus&memory_type=GDDR6%2CGDDR7');
  });

  it('toggles a value in a comma list', () => {
    expect(toggle('asus,msi', 'msi')).toBe('asus');
    expect(toggle('asus', 'msi')).toBe('asus,msi');
    expect(toggle('asus', 'asus')).toBeUndefined();
    expect(toggle(undefined, 'asus')).toBe('asus');
  });

  it('calls a list filtered when it has anything but the page (FR-040)', () => {
    expect(isFiltered({ page: '2' })).toBe(false);
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ sort: 'name' })).toBe(true);
  });

  it('turns the range form names into one min-max parameter', () => {
    expect(
      normaliseRanges({ brand: 'asus', 'price.min': '200', 'price.max': '', page: '2' }),
    ).toEqual({
      brand: 'asus',
      price: '200-',
    });
    expect(
      normaliseRanges({ 'memory_size.min': '', 'memory_size.max': '', memory_size: '8-16' }),
    ).toEqual({});
    expect(normaliseRanges({ brand: 'asus' })).toBeUndefined();
    expect(rangeOf('200-500')).toEqual({ min: '200', max: '500' });
    expect(rangeOf('-500')).toEqual({ min: undefined, max: '500' });
    expect(rangeOf(undefined)).toEqual({});
  });

  it('drops the refused fields, or goes to the bare page when none is in the address', () => {
    expect(withoutRefused('/c/gpus', { brand: 'asus', price: 'x', page: '3' }, ['price'])).toBe(
      '/c/gpus?brand=asus&page=3',
    );
    expect(withoutRefused('/c/gpus', { brand: 'asus', page: '0' }, ['page'])).toBe(
      '/c/gpus?brand=asus',
    );
    expect(withoutRefused('/c/gpus', { brand: 'asus' }, ['colour'])).toBe('/c/gpus');
    expect(withoutRefused('/c/gpus', { brand: 'asus' }, [])).toBe('/c/gpus');
  });

  it('prints euros with VAT as the shop does', () => {
    expect(euros(129999)).toBe('€1,299.99');
    expect(euros(99)).toBe('€0.99');
  });
});
