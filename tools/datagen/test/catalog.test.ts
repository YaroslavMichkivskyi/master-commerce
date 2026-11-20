import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/catalog/brands.js';
import { allowed, leaves, nodes } from './support.js';

// The fixed catalog description (spec FR-003, FR-004, plan D-6) against the rules the
// catalog database enforces (TASK-4 data-model) and its own consistency.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CODE = /^[a-z][a-z0-9_]*$/;
const SEEDED = ['cpus', 'graphics-cards', 'motherboards', 'memory', 'storage', 'laptops'];

const brandSlugs = new Set(BRANDS.map((b) => b.slug));

describe('the category tree (FR-003)', () => {
  it('has about 20 leaves on two or three levels', () => {
    expect(leaves.length).toBeGreaterThanOrEqual(18);
    expect(leaves.length).toBeLessThanOrEqual(24);
    expect(new Set(leaves.map((l) => l.depth))).toEqual(new Set([2, 3]));
  });

  it('holds the six seeded categories under their slugs and names', () => {
    const bySlug = new Map(nodes.map((n) => [n.def.slug, n.def.name]));
    expect(SEEDED.map((s) => bySlug.get(s))).toEqual([
      'CPUs',
      'Graphics cards',
      'Motherboards',
      'Memory',
      'Storage',
      'Laptops',
    ]);
  });

  it('has unique, well-formed slugs and names the database accepts', () => {
    const slugs = nodes.map((n) => n.def.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const n of nodes) {
      expect(n.def.slug).toMatch(SLUG);
      expect(n.def.name.length).toBeGreaterThan(0);
      expect(n.def.name.length).toBeLessThanOrEqual(100);
      expect(n.def.name).toBe(n.def.name.trim());
    }
  });

  it('uses all five attribute types, some inherited from inner categories', () => {
    const types = new Set(nodes.flatMap((n) => n.def.attributes.map((a) => a.type)));
    expect([...types].sort()).toEqual(['boolean', 'multi_select', 'number', 'select', 'text']);
    expect(nodes.some((n) => !n.def.leaf && n.def.attributes.length > 0)).toBe(true);
  });

  it('keeps attribute codes unique along every path (TASK-4 FR-015)', () => {
    for (const leaf of leaves) {
      const codes = leaf.path.map((a) => a.code);
      expect(new Set(codes).size, leaf.def.slug).toBe(codes.length);
    }
  });

  it('defines every attribute as the database checks it', () => {
    for (const a of nodes.flatMap((n) => n.def.attributes)) {
      const list = a.type === 'select' || a.type === 'multi_select';
      expect(a.code, a.code).toMatch(CODE);
      expect(a.code.length).toBeLessThanOrEqual(50);
      expect(a.name.length).toBeLessThanOrEqual(100);
      expect(list, a.code).toBe((a.values?.length ?? 0) > 0);
      if (a.type !== 'number') {
        expect([a.unit, a.min, a.max, a.whole], a.code).toEqual([
          undefined,
          undefined,
          undefined,
          undefined,
        ]);
      }
      if (a.min !== undefined && a.max !== undefined) expect(a.min).toBeLessThanOrEqual(a.max);
      if (a.unit !== undefined) expect(a.unit.length).toBeGreaterThan(0);
      if (a.unit !== undefined) expect(a.unit.length).toBeLessThanOrEqual(20);
      expect(a.type === 'text', a.code).toBe(a.maxLength !== undefined);
      if (a.maxLength !== undefined) expect(a.maxLength).toBeLessThanOrEqual(500);
      if (a.values) expect(new Set(a.values).size).toBe(a.values.length);
    }
  });
});

describe('brands (FR-004)', () => {
  it('has about 50 brands with unique slugs and three-letter SKU codes', () => {
    expect(BRANDS.length).toBeGreaterThanOrEqual(45);
    expect(BRANDS.length).toBeLessThanOrEqual(60);
    expect(brandSlugs.size).toBe(BRANDS.length);
    expect(new Set(BRANDS.map((b) => b.code)).size).toBe(BRANDS.length);
    for (const b of BRANDS) {
      expect(b.slug).toMatch(SLUG);
      expect(b.code).toMatch(/^[A-Z]{3}$/);
      expect(b.name).toBe(b.name.trim());
    }
  });

  it('puts every brand in at least one leaf, and most in several', () => {
    const leavesOf = (slug: string) =>
      leaves.filter((l) => l.def.leaf!.brands.includes(slug)).length;
    for (const b of BRANDS) expect(leavesOf(b.slug), b.slug).toBeGreaterThan(0);
    const several = BRANDS.filter((b) => leavesOf(b.slug) >= 2).length;
    expect(several / BRANDS.length).toBeGreaterThan(0.5);
  });

  it('names only known brands and leaves in product lines', () => {
    const leafSlugs = new Set(leaves.map((l) => l.def.slug));
    for (const b of BRANDS) {
      for (const leaf of Object.keys(b.lines ?? {}))
        expect(leafSlugs.has(leaf), `${b.slug}: ${leaf}`).toBe(true);
    }
    for (const l of leaves) {
      for (const slug of l.def.leaf!.brands)
        expect(brandSlugs.has(slug), `${l.def.slug}: ${slug}`).toBe(true);
    }
  });
});

describe('what a leaf can draw (FR-005, FR-008, plan D-6)', () => {
  it('gives every brand of a leaf at least one model it makes', () => {
    for (const l of leaves) {
      const { models, brands } = l.def.leaf!;
      for (const brand of brands) {
        expect(
          models.some((m) => !m.brands || m.brands.includes(brand)),
          `${l.def.slug}: ${brand}`,
        ).toBe(true);
      }
    }
  });

  it('allows every fixed value and every choice by the attribute it is for', () => {
    for (const l of leaves) {
      const leaf = l.def.leaf!;
      const byCode = new Map(l.path.map((a) => [a.code, a]));
      const check = (where: string, code: string, value: unknown) => {
        const a = byCode.get(code);
        expect(a, `${l.def.slug}: ${where} names unknown attribute ${code}`).toBeDefined();
        expect(
          allowed(a!, value),
          `${l.def.slug}: ${where} ${code} = ${JSON.stringify(value)}`,
        ).toBe(true);
      };
      for (const m of leaf.models) {
        for (const [code, value] of Object.entries(m.specs ?? {}))
          check(`model ${m.name}`, code, value);
        for (const [code, values] of Object.entries(m.choices ?? {})) {
          for (const v of values) check(`model ${m.name} choice`, code, v);
        }
      }
      for (const [code, values] of Object.entries(leaf.choices ?? {})) {
        for (const v of values) check('leaf choice', code, v);
      }
      for (const a of l.path) {
        for (const v of a.draw?.choices ?? []) check('draw choice', a.code, v);
      }
      // A spec in the name must always be there: required, or fixed by every model;
      // an optional one would put "undefined" into some names and slugs.
      for (const code of leaf.nameSpecs ?? []) {
        expect(byCode.has(code), `${l.def.slug}: ${code}`).toBe(true);
        const always =
          byCode.get(code)!.required || leaf.models.every((m) => m.specs?.[code] !== undefined);
        expect(always, `${l.def.slug}: name spec ${code} may be missing`).toBe(true);
      }
      expect(leaf.price[0]).toBeGreaterThan(0);
      expect(leaf.price[0]).toBeLessThan(leaf.price[1]);
      expect(leaf.weight).toBeGreaterThan(0);
      expect(leaf.blurb.length).toBeGreaterThan(0);
    }
  });

  it('can draw a value for every attribute without a fixed one', () => {
    for (const l of leaves) {
      const leaf = l.def.leaf!;
      for (const a of l.path) {
        const sources = [
          a.draw?.choices,
          leaf.choices?.[a.code],
          ...leaf.models.map((m) => m.choices?.[a.code]),
        ];
        const fixedEverywhere = leaf.models.every((m) => m.specs?.[a.code] !== undefined);
        if (fixedEverywhere) continue;
        if (a.type === 'text') {
          expect(
            leaf.models.every(
              (m) =>
                m.specs?.[a.code] !== undefined ||
                m.choices?.[a.code] ||
                leaf.choices?.[a.code] ||
                a.draw?.choices,
            ),
            `${l.def.slug}: ${a.code} has nothing to draw from`,
          ).toBe(true);
        }
        if (a.type === 'number' && !sources.some(Boolean)) {
          expect(
            a.min !== undefined && a.max !== undefined,
            `${l.def.slug}: ${a.code} needs a range`,
          ).toBe(true);
        }
      }
    }
  });
});
