import { describe, expect, it } from 'vitest';
import { csvLine, json, textArray } from '../src/csv.js';
import { uuidV7 } from '../src/ids.js';
import { stream } from '../src/random.js';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV7 (plan D-5)', () => {
  it('has the version and variant bits and the time in its first 48 bits', () => {
    const t = Date.UTC(2025, 0, 1);
    const id = uuidV7(t, stream('ids', 'x'));
    expect(id).toMatch(UUID_V7);
    expect(parseInt(id.replace('-', '').slice(0, 12), 16)).toBe(t);
  });

  it('sorts later times after earlier ones, as text and as PostgreSQL compares uuids', () => {
    const r = stream('ids', 'order');
    const ids = [0, 1, 2, 1000, 2 ** 40].map((ms) => uuidV7(Date.UTC(2025, 0, 1) + ms, r));
    expect([...ids].sort()).toEqual(ids);
  });

  it('refuses a time outside 48 bits', () => {
    expect(() => uuidV7(-1, stream('ids', 'x'))).toThrow();
    expect(() => uuidV7(2 ** 48, stream('ids', 'x'))).toThrow();
  });
});

describe('csvLine (plan D-1)', () => {
  it('writes every kind of cell in one fixed form', () => {
    expect(
      csvLine([
        'ASUS',
        'say "hi", ok',
        '',
        null,
        32999,
        2.46,
        true,
        new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 5)),
        json({ memory_size: 8, memory_type: 'GDDR6' }),
        textArray(['GDDR6', 'say "x"', 'a\\b']),
      ]),
    ).toBe(
      '"ASUS","say ""hi"", ok","",,32999,2.46,true,2025-01-01T12:00:00.005Z,' +
        '"{""memory_size"":8,""memory_type"":""GDDR6""}",' +
        '"{""GDDR6"",""say \\""x\\"""",""a\\\\b""}"\n',
    );
  });

  it('refuses a number that is not finite', () => {
    expect(() => csvLine([Number.NaN])).toThrow();
  });
});
