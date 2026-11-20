import { describe, expect, it } from 'vitest';
import { cumulative, stream, zipf } from '../src/random.js';

describe('seeded streams (plan D-2)', () => {
  it('gives the pinned sequence for a seed and key, on every machine', () => {
    const r = stream('demo', 'test');
    expect(Array.from({ length: 5 }, () => r.next())).toEqual([
      2041476243, 2100293564, 582963738, 3541589759, 2737883898,
    ]);
  });

  it('gives equal streams for equal keys and others for other keys or seeds', () => {
    const draw = (seed: string, key: string) => {
      const r = stream(seed, key);
      return Array.from({ length: 20 }, () => r.next());
    };
    expect(draw('s', 'product:1')).toEqual(draw('s', 'product:1'));
    expect(draw('s', 'product:1')).not.toEqual(draw('s', 'product:2'));
    expect(draw('s', 'product:1')).not.toEqual(draw('t', 'product:1'));
    // The separator keeps "a" + "b:c" apart from "a:b" + "c".
    expect(draw('a', 'b:c')).not.toEqual(draw('a:b', 'c'));
  });

  it('gives distinct streams to many product keys (no 32-bit seed collisions)', () => {
    // A 32-bit hash of the key gave seed "42" equal streams for product 90054 and
    // 572040, and dozens more pairs up to a million products.
    const starts = new Set<string>();
    for (let i = 0; i < 600_000; i++) {
      const r = stream('42', `product:${i}`);
      starts.add(`${r.next()}:${r.next()}`);
    }
    expect(starts.size).toBe(600_000);
  });

  it('draws integers in range, both ends included, about uniformly', () => {
    const r = stream('uniform', 'int');
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60_000; i++) counts[r.int(0, 5)]!++;
    for (const n of counts) expect(Math.abs(n - 10_000)).toBeLessThan(500);
  });

  it('keeps floats in [0, 1) and chance near its probability', () => {
    const r = stream('float', 'x');
    let hits = 0;
    for (let i = 0; i < 100_000; i++) {
      const f = r.float();
      expect(f >= 0 && f < 1).toBe(true);
      if (r.chance(0.3)) hits++;
    }
    expect(Math.abs(hits / 100_000 - 0.3)).toBeLessThan(0.01);
  });

  it('picks by cumulative weights', () => {
    const r = stream('weights', 'x');
    const cdf = cumulative([1, 3, 0, 6]);
    expect(cdf).toEqual([0.1, 0.4, 0.4, 1]);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 100_000; i++) counts[r.index(cdf)]!++;
    expect(counts[2]).toBe(0); // a zero weight is never drawn
    expect(Math.abs(counts[3]! / 100_000 - 0.6)).toBeLessThan(0.01);
    expect(() => cumulative([0, 0])).toThrow();
  });

  it('draws Zipf ranks: frequency falls as rank^-exponent', () => {
    const r = stream('zipf', 'x');
    const cdf = zipf(20, 1.1);
    const counts = new Array<number>(20).fill(0);
    for (let i = 0; i < 200_000; i++) counts[r.index(cdf)]!++;
    // Rank 1 against rank 2 and rank 10: 2^1.1 ≈ 2.14, 10^1.1 ≈ 12.6.
    expect(counts[0]! / counts[1]!).toBeCloseTo(2.14, 0);
    expect(counts[0]! / counts[9]!).toBeGreaterThan(10);
    expect(counts[0]! / counts[9]!).toBeLessThan(15.5);
  });
});
