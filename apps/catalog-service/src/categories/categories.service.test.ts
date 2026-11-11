import { describe, expect, it } from 'vitest';
import { toListDto } from './categories.service.js';

describe('toListDto', () => {
  it('keeps the order and exposes only public fields', () => {
    const createdAt = new Date('2026-11-09T00:00:00Z');
    const dto = toListDto([
      { id: 'a', name: 'CPUs', slug: 'cpus', sortOrder: 10, createdAt },
      { id: 'b', name: 'Memory', slug: 'memory', sortOrder: 40, createdAt },
    ]);

    expect(dto).toEqual({
      items: [
        { id: 'a', name: 'CPUs', slug: 'cpus', sortOrder: 10 },
        { id: 'b', name: 'Memory', slug: 'memory', sortOrder: 40 },
      ],
    });
  });

  it('returns an empty list for no rows', () => {
    expect(toListDto([])).toEqual({ items: [] });
  });
});
