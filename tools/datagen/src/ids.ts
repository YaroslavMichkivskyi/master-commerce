import type { Random } from './random.js';

const hex = (value: number, digits: number) => value.toString(16).padStart(digits, '0');

/**
 * A UUIDv7 (RFC 9562) with the given Unix time in milliseconds and random bits from
 * `random` (plan D-5): ids made for later times sort after earlier ones, like the ids
 * the catalog database makes itself (ADR 0022).
 */
export function uuidV7(unixMs: number, random: Random): string {
  if (!Number.isInteger(unixMs) || unixMs < 0 || unixMs >= 2 ** 48) {
    throw new Error(`time ${unixMs} does not fit 48 bits`);
  }
  const time = hex(unixMs, 12);
  const randA = random.next() & 0x0fff; // 12 bits
  const variant = 0x8000 | (random.next() & 0x3fff); // 10xx + 14 bits
  const tail = hex(random.next(), 8) + hex(random.next() & 0xffff, 4); // 48 bits
  return `${time.slice(0, 8)}-${time.slice(8)}-` + `7${hex(randA, 3)}-${hex(variant, 4)}-${tail}`;
}
