import { BadRequestException } from '@nestjs/common';
import {
  type FieldErrorDto,
  SLUG_PATTERN,
  STOREFRONT_PAGE_MAX,
  STOREFRONT_PARAMETERS,
  STOREFRONT_SORTS,
  type StorefrontSort,
} from '@master-commerce/dto';
import type { AttributeType } from '../db/schema.js';

// Query parameters of a list → filters (TASK-6 FR-002, research R-7, R-9a). The
// parameters are free-form; only what the category's attributes define is read, every
// value is checked here and later bound as a parameter, never spliced into SQL.

/** What the storefront needs of an attribute of the category. */
export interface StorefrontAttribute {
  code: string;
  name: string;
  type: AttributeType;
  unit: string | null;
  /** `select` / `multi_select`: the allowed values, in their order (facets follow it). */
  allowedValues?: readonly string[] | null;
}

export type AttributeFilter =
  | { kind: 'values'; attribute: StorefrontAttribute; values: string[] }
  | { kind: 'range'; attribute: StorefrontAttribute; min?: number; max?: number };

export interface ListFilters {
  brands: string[];
  /** Euro cents. */
  price: { min?: number; max?: number };
  inStock: boolean;
  /** Search and brand pages: a category slug (its subtree). */
  category?: string;
  attributes: AttributeFilter[];
  sort: StorefrontSort;
  page: number;
}

export const LIMITS = {
  queryLength: 200,
  queryWords: 10,
  valuesPerFilter: 50,
  valueLength: 100,
  filters: 30,
} as const;

/** Parameter names that win over an attribute with the same code (research R-7). */
export const RESERVED: ReadonlySet<string> = new Set(STOREFRONT_PARAMETERS);

/** `min-max`, either side optional; numbers with an optional fraction. */
// At most 15 digits a side, so a value stays a finite number (a facet echoes it back).
const RANGE = /^(-?\d{1,15}(?:\.\d{1,6})?)?-(-?\d{1,15}(?:\.\d{1,6})?)?$/;
const PRICE = /^(\d{1,12}(?:\.\d{1,2})?)?-(\d{1,12}(?:\.\d{1,2})?)?$/;
/** The largest price the `price_cents` column holds (PostgreSQL `integer`). */
export const PRICE_CENTS_MAX = 2_147_483_647;

type RawQuery = Readonly<Record<string, unknown>>;

/** Text, or a list of texts (a repeated parameter); anything else (`a[b]=c`) is not. */
const isText = (value: unknown): value is string | string[] =>
  typeof value === 'string' || (Array.isArray(value) && value.every((v) => typeof v === 'string'));

/** A parameter as one string: repeated parameters are joined like a comma list. */
function text(query: RawQuery, name: string): string | undefined {
  const value = query[name];
  if (!isText(value)) return undefined; // missing; a nested one is refused first
  const joined = Array.isArray(value) ? value.join(',') : value;
  return joined.trim() === '' ? undefined : joined;
}

const list = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '');

/**
 * Reads a list's query against the attributes of its scope. Unknown parameters and
 * attributes the scope does not have are ignored; malformed values answer `400` with
 * every offending field.
 */
export function parseFilters(
  query: RawQuery,
  attributes: readonly StorefrontAttribute[],
  options: { search: boolean; categoryFilter: boolean },
): ListFilters {
  const errors: FieldErrorDto[] = [];
  const fail = (field: string, message: string) => errors.push({ field, messages: [message] });
  // A nested parameter (`brand[x]=1`, parsed into an object) is never a valid filter.
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && !isText(value)) fail(name, `${name} must be text`);
  }

  const brands = list(text(query, 'brand') ?? '');
  if (brands.length > LIMITS.valuesPerFilter)
    fail('brand', `at most ${LIMITS.valuesPerFilter} brands`);
  if (brands.some((b) => b.length > LIMITS.valueLength || !SLUG_PATTERN.test(b))) {
    fail('brand', 'brand must be brand slugs, comma-separated');
  }

  const price: ListFilters['price'] = {};
  const priceText = text(query, 'price');
  if (priceText !== undefined) {
    const m = PRICE.exec(priceText);
    if (!m || (m[1] === undefined && m[2] === undefined)) {
      fail('price', 'price must be euros as min-max, e.g. 200-500, 200- or -500');
    } else {
      // Beyond what a price can be: a "from" that high finds nothing, a "to" that high is
      // no upper bound — never a number the column cannot compare with.
      if (m[1] !== undefined) price.min = Math.min(Math.round(Number(m[1]) * 100), PRICE_CENTS_MAX);
      if (m[2] !== undefined) {
        const max = Math.round(Number(m[2]) * 100);
        if (max < PRICE_CENTS_MAX) price.max = max;
      }
      if (price.min !== undefined && price.max !== undefined && price.min > price.max) {
        fail('price', 'the lowest price must not be above the highest');
      }
    }
  }

  const stockText = text(query, 'stock');
  if (stockText !== undefined && stockText !== 'in') fail('stock', 'stock must be "in"');

  const sorts: readonly string[] = options.search
    ? STOREFRONT_SORTS
    : STOREFRONT_SORTS.filter((s) => s !== 'relevance');
  const sortText = text(query, 'sort') ?? (options.search ? 'relevance' : 'new');
  if (!sorts.includes(sortText)) fail('sort', `sort must be one of ${sorts.join(', ')}`);

  // A page past the paging limit answers the last page that may be shown (spec, edge
  // cases); only a page that is not a whole number from 1 is refused.
  const pageText = text(query, 'page') ?? '1';
  const asked = /^\d{1,100}$/.test(pageText) ? Number(pageText) : NaN;
  if (!(asked >= 1)) fail('page', 'page must be a whole number from 1');
  const page = Math.min(asked, STOREFRONT_PAGE_MAX);

  let category: string | undefined;
  if (options.categoryFilter) {
    category = text(query, 'category');
    if (
      category !== undefined &&
      (category.length > LIMITS.valueLength || !SLUG_PATTERN.test(category))
    ) {
      fail('category', 'category must be a category slug');
    }
  }

  const filters: AttributeFilter[] = [];
  for (const attribute of attributes) {
    if (RESERVED.has(attribute.code) || attribute.type === 'text') continue;
    const value = text(query, attribute.code);
    if (value === undefined) continue;
    if (attribute.type === 'number') {
      const m = RANGE.exec(value);
      if (!m || (m[1] === undefined && m[2] === undefined)) {
        fail(attribute.code, `${attribute.code} must be a range min-max, e.g. 8-16`);
        continue;
      }
      const min = m[1] === undefined ? undefined : Number(m[1]);
      const max = m[2] === undefined ? undefined : Number(m[2]);
      if (min !== undefined && max !== undefined && min > max) {
        fail(attribute.code, 'the lowest value must not be above the highest');
        continue;
      }
      filters.push({ kind: 'range', attribute, min, max });
      continue;
    }
    const values = [...new Set(list(value))];
    if (
      values.length > LIMITS.valuesPerFilter ||
      values.some((v) => v.length > LIMITS.valueLength)
    ) {
      fail(
        attribute.code,
        `at most ${LIMITS.valuesPerFilter} values of up to ${LIMITS.valueLength} characters`,
      );
      continue;
    }
    if (attribute.type === 'boolean' && values.some((v) => v !== 'true' && v !== 'false')) {
      fail(attribute.code, `${attribute.code} must be true or false`);
      continue;
    }
    if (values.length > 0) filters.push({ kind: 'values', attribute, values });
  }
  if (filters.length > LIMITS.filters)
    fail('filters', `at most ${LIMITS.filters} attribute filters`);

  if (errors.length > 0)
    throw new BadRequestException({ message: 'The request is invalid', errors });
  return {
    brands,
    price,
    inStock: stockText === 'in',
    category,
    attributes: filters,
    sort: sortText as StorefrontSort,
    page,
  };
}
