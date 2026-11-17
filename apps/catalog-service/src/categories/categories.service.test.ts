import { describe, expect, it } from 'vitest';
import { toListDto } from './categories.service.js';

describe('toListDto', () => {
  it('keeps the order and exposes only public fields', () => {
    const dto = toListDto([
      { id: 'a', name: 'CPUs', slug: 'cpus', sortOrder: 10, parentId: null },
      { id: 'b', name: 'Memory', slug: 'memory', sortOrder: 40, parentId: 'a' },
    ]);

    expect(dto).toEqual({
      items: [
        { id: 'a', name: 'CPUs', slug: 'cpus', sortOrder: 10, parentId: null },
        { id: 'b', name: 'Memory', slug: 'memory', sortOrder: 40, parentId: 'a' },
      ],
    });
  });

  it('returns an empty list for no rows', () => {
    expect(toListDto([])).toEqual({ items: [] });
  });
});
