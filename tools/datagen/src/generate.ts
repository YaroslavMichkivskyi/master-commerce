import { createHash } from 'node:crypto';
import { BRANDS } from './catalog/brands.js';
import { TREE } from './catalog/tree.js';
import type {
  AttributeDef,
  BrandDef,
  CategoryDef,
  Choices,
  LeafDef,
  ModelDef,
  SpecValue,
} from './catalog/types.js';
import { type Cell, csvLine, json, textArray } from './csv.js';
import { uuidV7 } from './ids.js';
import { type Random, stream, zipf } from './random.js';

export interface GenerateOptions {
  seed: string;
  /** How many products; 1 or more (spec FR-002). */
  products: number;
  /** The Zipf exponent of products per brand (spec FR-006). */
  zipf: number;
}

/** One table of the load: its columns, in `COPY` order, and its rows, produced lazily. */
export interface Table {
  name: string;
  columns: readonly string[];
  rows: () => Iterable<readonly Cell[]>;
}

// Generated times (plan D-5): the catalog's own rows first, then the products, spread
// evenly over a fixed past window so ids grow with the row index.
const CATALOG_START = Date.UTC(2024, 11, 1);
const PRODUCTS_START = Date.UTC(2025, 0, 1);
const PRODUCTS_END = Date.UTC(2026, 5, 30);
const MINUTE = 60_000;

const OUT_OF_STOCK = 0.08;
const PUBLISHED = 0.9;
const PRESENT = 0.8;

interface Category {
  def: CategoryDef;
  id: string;
  parentId: string | null;
  sortOrder: number;
  /** The attributes along the path, root first (the effective attributes, TASK-4 FR-015). */
  path: readonly AttributeDef[];
}

interface Leaf {
  category: Category;
  def: LeafDef;
  brands: readonly BrandDef[];
  brandCdf: readonly number[];
  /** The leaf's models per brand slug, by tier. */
  models: ReadonlyMap<string, readonly ModelDef[]>;
}

const sortedByTier = (models: readonly ModelDef[]) => [...models].sort((a, b) => a.tier - b.tier);

/** The fixed part of the catalog: categories in tree order, with ids from the seed. */
function categoriesOf(seed: string): Category[] {
  const out: Category[] = [];
  const walk = (
    defs: readonly CategoryDef[],
    parentId: string | null,
    path: readonly AttributeDef[],
  ) => {
    defs.forEach((def, i) => {
      const time = CATALOG_START + out.length * MINUTE;
      const category: Category = {
        def,
        id: uuidV7(time, stream(seed, `category:${def.slug}`)),
        parentId,
        sortOrder: (i + 1) * 10,
        path: [...path, ...def.attributes],
      };
      out.push(category);
      if (def.children) walk(def.children, category.id, category.path);
    });
  };
  walk(TREE, null, []);
  return out;
}

function leavesOf(categories: readonly Category[], exponent: number): Leaf[] {
  const bySlug = new Map(BRANDS.map((b) => [b.slug, b]));
  return categories.flatMap((category) => {
    const def = category.def.leaf;
    if (!def) return [];
    const brands = def.brands.map((slug) => {
      const brand = bySlug.get(slug);
      if (!brand) throw new Error(`${category.def.slug}: unknown brand ${slug}`);
      return brand;
    });
    const models = new Map(
      brands.map((b) => [
        b.slug,
        sortedByTier(def.models.filter((m) => !m.brands || m.brands.includes(b.slug))),
      ]),
    );
    return [{ category, def, brands, brandCdf: zipf(brands.length, exponent), models }];
  });
}

/** Products per leaf: `round(N × weight)`, the remainder to the heaviest leaves (plan D-3). */
function countsOf(leaves: readonly Leaf[], products: number): number[] {
  const total = leaves.reduce((sum, l) => sum + l.def.weight, 0);
  const exact = leaves.map((l) => (products * l.def.weight) / total);
  const counts = exact.map(Math.floor);
  let left = products - counts.reduce((a, b) => a + b, 0);
  const order = leaves
    .map((_, i) => i)
    .sort((a, b) => exact[b]! - counts[b]! - (exact[a]! - counts[a]!) || a - b);
  for (const i of order) {
    if (left === 0) break;
    counts[i]!++;
    left--;
  }
  return counts;
}

/**
 * The leaf of every product in turn (smooth weighted round robin over the counts):
 * exactly `counts[i]` products per leaf, interleaved, so ids in a row of creation
 * order are not one category after another.
 */
function* leafOrder(counts: readonly number[]): Generator<number> {
  const total = counts.reduce((a, b) => a + b, 0);
  const current = counts.map(() => 0);
  for (let n = 0; n < total; n++) {
    let best = 0;
    for (let i = 0; i < counts.length; i++) {
      current[i]! += counts[i]!;
      if (current[i]! > current[best]!) best = i;
    }
    current[best]! -= total;
    yield best;
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Two decimals at most, the same on every machine. */
const round2 = (x: number) => Math.round(x * 100) / 100;

/** An item further along `items` for a higher tier, with some spread. */
function byTier<T>(items: readonly T[], tier: number, random: Random): T {
  const spread = (random.float() - 0.5) * 0.3;
  return items[Math.round(clamp01(tier + spread) * (items.length - 1))]!;
}

function drawValue(
  attribute: AttributeDef,
  choices: readonly (string | number)[] | undefined,
  tier: number,
  random: Random,
): SpecValue {
  const draw = attribute.draw ?? {};
  const pick = <T>(items: readonly T[]) =>
    draw.byTier ? byTier(items, tier, random) : random.pick(items);
  switch (attribute.type) {
    case 'select':
      return String(pick(choices ?? attribute.values ?? []));
    case 'text':
      return String(pick(choices ?? []));
    case 'boolean':
      return random.chance(draw.p ?? 0.5);
    case 'multi_select': {
      const values = attribute.values ?? [];
      const [least, most] = draw.count ?? [1, values.length];
      const n = random.int(least, Math.min(most, values.length));
      const chosen = new Set<string>();
      while (chosen.size < n) chosen.add(random.pick(values));
      return values.filter((v) => chosen.has(v)); // in the attribute's order
    }
    case 'number': {
      if (choices) return Number(pick(choices));
      const min = attribute.min ?? 0;
      const max = attribute.max ?? min;
      const step = draw.step ?? (attribute.whole ? 1 : 0.1);
      const steps = Math.floor((max - min) / step + 1e-9);
      const k = draw.byTier
        ? Math.round(clamp01(tier + (random.float() - 0.5) * 0.3) * steps)
        : random.int(0, steps);
      const value = round2(min + k * step);
      return attribute.whole ? Math.round(value) : value;
    }
  }
}

/** "32GB", "850 W", "27 in": a spec as it ends a product name. */
function nameSpec(attribute: AttributeDef, value: SpecValue): string {
  if (attribute.code === 'capacity_gb' && typeof value === 'number' && value >= 1000) {
    return `${round2(value / 1000)}TB`;
  }
  const unit = attribute.unit ?? '';
  return unit === 'GB' ? `${String(value)}GB` : `${String(value)} ${unit}`.trim();
}

/** Lowercase words joined by single dashes, at most `max` characters. */
function slugify(text: string, max: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, max).replace(/-+$/, '');
}

/** Ends in 99 cents, the way shops price (plan D-6). */
const shopPrice = (cents: number) => Math.max(99, Math.floor(cents / 100) * 100 + 99);

/** Out of stock sometimes, otherwise a few units, now and then many. */
function stockOf(random: Random): number {
  if (random.chance(OUT_OF_STOCK)) return 0;
  return Math.min(999, 1 + Math.floor(-Math.log(1 - random.float()) * 25));
}

const PRODUCT_COLUMNS = [
  'id',
  'name',
  'slug',
  'sku',
  'description',
  'brand_id',
  'category_id',
  'price_cents',
  'stock',
  'specs',
  'published',
  'created_at',
  'updated_at',
] as const;

/**
 * The tables of a catalog for the options, in load order: brand, category,
 * category_attribute, product (plan D-1). Equal options give equal rows.
 */
export function generate(options: GenerateOptions): Table[] {
  const { seed, products } = options;
  if (!Number.isInteger(products) || products < 1) {
    throw new Error(`products must be a whole number of 1 or more, not ${products}`);
  }
  if (!(options.zipf > 0)) throw new Error(`the Zipf exponent must be above 0`);

  const brandIds = new Map(
    BRANDS.map((b, i) => [
      b.slug,
      uuidV7(CATALOG_START + i * MINUTE, stream(seed, `brand:${b.slug}`)),
    ]),
  );
  const categories = categoriesOf(seed);
  const leaves = leavesOf(categories, options.zipf);
  const counts = countsOf(leaves, products);
  const catalogTime = (i: number) => new Date(CATALOG_START + i * MINUTE);
  const span = PRODUCTS_END - PRODUCTS_START;

  function product(index: number, leaf: Leaf): Cell[] {
    const random = stream(seed, `product:${index}`);
    const brand = leaf.brands[random.index(leaf.brandCdf)]!;
    const models = leaf.models.get(brand.slug)!;
    const u = random.float();
    const model = models[Math.min(models.length - 1, Math.floor(u * models.length))]!;
    const tier = clamp01((model.tier + u) / 2);
    const lines = brand.lines?.[leaf.category.def.slug];
    const line = lines ? random.pick(lines) : '';

    const specs: Record<string, SpecValue> = {};
    for (const attribute of leaf.category.path) {
      const fixed = model.specs?.[attribute.code];
      if (fixed !== undefined) {
        specs[attribute.code] = fixed;
        continue;
      }
      if (!attribute.required && !random.chance(attribute.present ?? PRESENT)) continue;
      const choices: Choices[string] | undefined =
        model.choices?.[attribute.code] ??
        leaf.def.choices?.[attribute.code] ??
        attribute.draw?.choices;
      specs[attribute.code] = drawValue(attribute, choices, tier, random);
    }

    const suffix = (leaf.def.nameSpecs ?? []).map((code) => {
      const attribute = leaf.category.path.find((a) => a.code === code)!;
      return nameSpec(attribute, specs[code]!);
    });
    const name = [brand.name, line, model.name, ...suffix].filter(Boolean).join(' ');
    const key = index.toString(36);
    const [low, high] = leaf.def.price;
    const price = shopPrice(low * (high / low) ** tier * (0.93 + 0.14 * random.float()));
    const time = PRODUCTS_START + Math.floor((index * span) / products);
    return [
      uuidV7(time, random),
      name,
      `${slugify(name, 100 - key.length - 1)}-${key}`,
      `${brand.code}-${leaf.category.def.slug.slice(0, 3).toUpperCase()}-${key.toUpperCase()}`,
      `${name}. ${leaf.def.blurb}`,
      brandIds.get(brand.slug)!,
      leaf.category.id,
      price,
      stockOf(random),
      json(specs),
      random.chance(PUBLISHED),
      new Date(time),
      new Date(time),
    ];
  }

  return [
    {
      name: 'brand',
      columns: ['id', 'name', 'slug', 'created_at', 'updated_at'],
      rows: () =>
        BRANDS.map((b, i) => [
          brandIds.get(b.slug)!,
          b.name,
          b.slug,
          catalogTime(i),
          catalogTime(i),
        ]),
    },
    {
      name: 'category',
      columns: ['id', 'name', 'slug', 'sort_order', 'parent_id', 'created_at', 'updated_at'],
      rows: () =>
        categories.map((c, i) => [
          c.id,
          c.def.name,
          c.def.slug,
          c.sortOrder,
          c.parentId,
          catalogTime(i),
          catalogTime(i),
        ]),
    },
    {
      name: 'category_attribute',
      columns: [
        'id',
        'category_id',
        'code',
        'name',
        'type',
        'required',
        'allowed_values',
        'unit',
        'min_value',
        'max_value',
        'whole_numbers',
        'max_length',
        'sort_order',
        'created_at',
        'updated_at',
      ],
      rows: function* () {
        let n = 0;
        for (const c of categories) {
          for (const [i, a] of c.def.attributes.entries()) {
            const time = catalogTime(n++);
            yield [
              uuidV7(time.getTime(), stream(seed, `attribute:${c.def.slug}:${a.code}`)),
              c.id,
              a.code,
              a.name,
              a.type,
              a.required,
              a.values ? textArray(a.values) : null,
              a.unit ?? null,
              a.min ?? null,
              a.max ?? null,
              a.whole ?? false,
              a.maxLength ?? null,
              (i + 1) * 10,
              time,
              time,
            ];
          }
        }
      },
    },
    {
      name: 'product',
      columns: PRODUCT_COLUMNS,
      rows: function* () {
        let index = 0;
        for (const leaf of leafOrder(counts)) yield product(index++, leaves[leaf]!);
      },
    },
  ];
}

/** The CSV lines of every table in order, with the table they belong to (plan D-1). */
export function* linesOf(tables: readonly Table[]): Generator<{ table: Table; line: string }> {
  for (const table of tables) {
    for (const row of table.rows()) yield { table, line: csvLine(row) };
  }
}

/** SHA-256 over every table's name, columns and lines, in order (spec FR-001). */
export function createDataHash() {
  const hash = createHash('sha256');
  let table: string | undefined;
  return {
    add(name: string, columns: readonly string[], line: string) {
      if (name !== table) {
        hash.update(`table ${name} (${columns.join(',')})\n`);
        table = name;
      }
      hash.update(line);
    },
    digest: () => hash.digest('hex'),
  };
}

/** The data hash of the options, without loading anything. */
export function dataHash(options: GenerateOptions): string {
  const hash = createDataHash();
  for (const { table, line } of linesOf(generate(options))) {
    hash.add(table.name, table.columns, line);
  }
  return hash.digest();
}
