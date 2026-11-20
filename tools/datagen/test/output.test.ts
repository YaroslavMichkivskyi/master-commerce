import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { describeUrl, failureMessage, parseScale, summary } from '../src/cli.js';
import { csvLine } from '../src/csv.js';
import { dataHash, generate } from '../src/generate.js';
import { DatagenError, output } from '../src/load.js';

// Output without a database, CSV files and the command's helpers (spec FR-002,
// FR-014, FR-015).

const options = { seed: 'out', products: 300, zipf: 1.1 };
const dir = mkdtempSync(join(tmpdir(), 'datagen-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('output without a database (FR-001, FR-014)', () => {
  it('counts every table and reports the same hash as dataHash', async () => {
    const result = await output(generate(options), {});
    expect(result.hash).toBe(dataHash(options));
    expect(result.counts.product).toBe(300);
    expect(Object.keys(result.counts)).toEqual([
      'brand',
      'category',
      'category_attribute',
      'product',
    ]);
  });

  it('writes one CSV file per table with exactly the lines it hashes', async () => {
    const result = await output(generate(options), { outDir: dir });
    expect(result.hash).toBe(dataHash(options));
    for (const table of generate(options)) {
      const expected = [...table.rows()].map(csvLine).join('');
      expect(readFileSync(join(dir, `${table.name}.csv`), 'utf8')).toBe(expected);
    }
  });
});

describe('the command (FR-002, FR-015)', () => {
  it.each([
    ['1k', 1000],
    ['100K', 100_000],
    ['1m', 1_000_000],
    ['2500', 2500],
  ])('reads --scale %s as %i products', (text, n) => {
    expect(parseScale(text)).toBe(n);
  });

  it.each(['0', '-5', '1.5', 'lots'])('refuses --scale %s', (text) => {
    expect(() => parseScale(text)).toThrow(DatagenError);
  });

  it('names the database without its password', () => {
    expect(describeUrl('postgres://catalog:secret@localhost:55433/catalog')).toBe(
      'localhost:55433/catalog',
    );
  });

  it('prints the parameters, rows per table, hash, time and memory', () => {
    const text = summary({
      seed: 'demo',
      products: 1000,
      zipf: 1.1,
      counts: { brand: 51, product: 1000 },
      hash: 'abc',
      target: 'loaded into localhost:55433/catalog',
      seconds: 1.234,
      peakMemoryMb: 80,
    });
    expect(text).toContain('seed "demo", 1000 products, Zipf 1.1');
    expect(text).toContain('rows: brand 51, product 1000');
    expect(text).toContain('hash: abc');
    expect(text).toContain('loaded into localhost:55433/catalog; 1.2 s; peak memory 80 MB');
  });

  it('reports an expected failure by its message, a bug in full', () => {
    expect(failureMessage(new DatagenError('not migrated'))).toBe('datagen: not migrated');
    const unknown = Object.assign(new TypeError('bad option'), {
      code: 'ERR_PARSE_ARGS_UNKNOWN_OPTION',
    });
    expect(failureMessage(unknown)).toBe('datagen: bad option');
    const bug = new Error('boom');
    expect(failureMessage(bug)).toBe(bug);
  });
});
