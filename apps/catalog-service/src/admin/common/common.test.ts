import { ConflictException, type HttpException, PreconditionFailedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { conflictOnUnique, pgErrorCode } from './executor.js';
import { toPage } from './paging.js';
import { etag, expectedVersion } from './versioning.js';

describe('If-Match (FR-033)', () => {
  it.each([
    ['"3"', 3],
    [' "12" ', 12],
    ['W/"7"', 7],
  ])('reads %j as version %i', (header, version) => {
    expect(expectedVersion(header)).toBe(version);
  });

  it.each([undefined, '', '  '])('answers 428 for %j', (header) => {
    try {
      expectedVersion(header);
      expect.unreachable();
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(428);
    }
  });

  it.each(['*', '3', '"0"', '"-1"', '"3", "4"', '"abc"', '"1234567890"'])(
    'answers 412 for %j: it matches no version',
    (header) => {
      expect(() => expectedVersion(header)).toThrow(PreconditionFailedException);
    },
  );

  it('writes the ETag a later If-Match is read from', () => {
    expect(expectedVersion(etag(42))).toBe(42);
  });
});

describe('toPage (FR-034)', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${i}` }));

  it('points at the last item kept when there is more', () => {
    expect(toPage(rows(3), 2)).toEqual({ items: rows(2), nextCursor: 'id-1' });
  });

  it('has no cursor on the last page', () => {
    expect(toPage(rows(2), 2)).toEqual({ items: rows(2), nextCursor: null });
    expect(toPage([], 2)).toEqual({ items: [], nextCursor: null });
  });
});

describe('PostgreSQL errors', () => {
  const unique = Object.assign(new Error('duplicate key'), { code: '23505' });

  it('finds the code also inside a wrapped error', () => {
    expect(pgErrorCode(new Error('query failed', { cause: unique }))).toBe('23505');
    expect(pgErrorCode(new Error('plain'))).toBeUndefined();
  });

  it('turns a unique violation into 409 and lets other errors through', async () => {
    await expect(conflictOnUnique(() => Promise.reject(unique), 'taken')).rejects.toThrow(
      ConflictException,
    );
    const sku = new Error('query failed', {
      cause: Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'sku_live' }),
    });
    await expect(
      conflictOnUnique(
        () => Promise.reject(sku),
        (c) => `taken: ${String(c)}`,
      ),
    ).rejects.toThrow('taken: sku_live');
    const other = new Error('connection lost');
    await expect(conflictOnUnique(() => Promise.reject(other), 'taken')).rejects.toBe(other);
  });
});
