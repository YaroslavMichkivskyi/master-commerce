import { createHash } from 'node:crypto';

// Seeded pseudo-random numbers (plan D-2). 32-bit integer arithmetic only, so every
// JavaScript engine on every platform gives the same sequence for the same seed.

const UINT32 = 2 ** 32;

/**
 * The 128-bit state of a key: the first 16 bytes of its SHA-256. A 32-bit hash would
 * give a million product keys about a hundred pairs of identical streams (the
 * birthday bound); 128 bits make that practically impossible.
 */
function stateOf(key: string): [number, number, number, number] {
  const digest = createHash('sha256').update(key, 'utf8').digest();
  return [
    digest.readUInt32BE(0),
    digest.readUInt32BE(4),
    digest.readUInt32BE(8),
    digest.readUInt32BE(12),
  ];
}

/**
 * A stream of random numbers (sfc32). Make one per purpose with `stream(seed, key)`, so
 * the values of one table or one product do not depend on how many numbers another used.
 */
export class Random {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor([a, b, c, d]: readonly [number, number, number, number]) {
    this.a = a >>> 0;
    this.b = b >>> 0;
    this.c = c >>> 0;
    this.d = d >>> 0;
    for (let i = 0; i < 12; i++) this.next(); // leave the seeding state behind
  }

  /** A uniform unsigned 32-bit integer. */
  next(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** A uniform number in [0, 1), exact: 32 random bits over 2^32. */
  float(): number {
    return this.next() / UINT32;
  }

  /** A uniform integer in [min, max], both included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.float() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick from an empty list');
    return items[Math.floor(this.float() * items.length)]!;
  }

  /** An index drawn by the cumulative weights `cdf` (last value 1). */
  index(cdf: readonly number[]): number {
    const u = this.float();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (u < cdf[mid]!) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
}

/** The stream of `key` under `seed`: equal keys give equal streams, any other key another. */
export function stream(seed: string, key: string): Random {
  return new Random(stateOf(`${seed}\u0000${key}`));
}

/** Cumulative weights for `index()`; the weights need not sum to 1. */
export function cumulative(weights: readonly number[]): number[] {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!(total > 0)) throw new Error('weights must sum to more than 0');
  let running = 0;
  const cdf = weights.map((w) => (running += w) / total);
  cdf[cdf.length - 1] = 1; // no rounding gap at the end
  return cdf;
}

/** Zipf over ranks 1..n: the weight of rank k is k^-exponent (plan D-3). */
export function zipf(n: number, exponent: number): number[] {
  return cumulative(Array.from({ length: n }, (_, k) => (k + 1) ** -exponent));
}
