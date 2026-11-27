import type {
  ProductCardListDto,
  ProductListPageDto,
  SitemapDto,
  SitemapPartDto,
  StorefrontProductDto,
  StorefrontTreeDto,
} from '@master-commerce/dto';
import { cache } from 'react';
import { gatewayUrl } from './gateway';
import type { SearchParams } from './query';

// The storefront API of the gateway (TASK-6 FR-020), server side only. Unfiltered pages
// are cached for 5 minutes; anything with a query is fetched per request (research R-6).

export const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 3000;

export type Answer<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'not-found' }
  /** The catalog refused the query; `fields` are the parameters it named. */
  | { kind: 'invalid'; fields: string[] }
  | { kind: 'unavailable' };

/**
 * Thrown by a page when the catalog cannot answer: `app/error.tsx` shows the message and
 * the response is a 5xx, so monitors and crawlers see the failure (spec, edge cases).
 */
export class CatalogUnavailableError extends Error {
  constructor() {
    super('The catalog is unavailable');
    this.name = 'CatalogUnavailableError';
  }
}

type Fetched = { status: number; body: unknown } | undefined;

/**
 * One request per address and render: the metadata and the page of a route ask for the
 * same list, and a fetch with a timeout signal is not deduplicated by React itself.
 */
const load = cache(async (address: string, store: boolean): Promise<Fetched> => {
  const url = new URL(address);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(store ? { next: { revalidate: REVALIDATE_SECONDS } } : { cache: 'no-store' as const }),
    });
    const readBody = res.ok || res.status === 400;
    return {
      status: res.status,
      body: readBody ? ((await res.json().catch(() => undefined)) as unknown) : undefined,
    };
  } catch {
    return undefined;
  }
});

async function get<T>(
  path: string,
  query: SearchParams = {},
  check?: (body: unknown) => boolean,
  { store = true }: { store?: boolean } = {},
): Promise<Answer<T>> {
  const url = new URL(`/api/v1/catalog${path}`, gatewayUrl());
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      url.searchParams.append(key, v);
    }
  }
  // A query (filters, sort, page, search) is fetched per request (FR-035).
  const res = await load(url.href, store && url.searchParams.size === 0);
  if (!res) return { kind: 'unavailable' };
  if (res.status === 404) return { kind: 'not-found' };
  if (res.status === 400) {
    const errors = (res.body as { errors?: { field?: unknown }[] } | undefined)?.errors;
    const fields = Array.isArray(errors)
      ? errors.map((e) => e.field).filter((f): f is string => typeof f === 'string')
      : [];
    return { kind: 'invalid', fields };
  }
  const body = res.body;
  // A 200 of another shape (a proxy, a foreign process) is "unavailable", never a crash.
  if (res.status >= 300 || typeof body !== 'object' || body === null || (check && !check(body)))
    return { kind: 'unavailable' };
  return { kind: 'ok', data: body as T };
}

const hasItems = (b: unknown) => Array.isArray((b as { items?: unknown }).items);

export const catalog = {
  tree: () => get<StorefrontTreeDto>('/categories', {}, hasItems),
  newest: (limit = 12) => get<ProductCardListDto>('/new', { limit: String(limit) }, hasItems),
  category: (slug: string, query: SearchParams) =>
    get<ProductListPageDto>(`/categories/${encodeURIComponent(slug)}/products`, query, hasItems),
  brand: (slug: string, query: SearchParams) =>
    get<ProductListPageDto>(`/brands/${encodeURIComponent(slug)}/products`, query, hasItems),
  search: (query: SearchParams) => get<ProductListPageDto>('/search', query, hasItems),
  product: (slug: string) =>
    get<StorefrontProductDto>(
      `/products/${encodeURIComponent(slug)}`,
      {},
      (b) => typeof (b as { slug?: unknown }).slug === 'string',
    ),
  sitemap: () =>
    get<SitemapDto>('/sitemap', {}, (b) => typeof (b as SitemapDto).productParts === 'number'),
  // A part is up to 50 000 entries — over the data cache's item limit, so not stored.
  sitemapPart: (part: number) =>
    get<SitemapPartDto>(`/sitemap/products/${part}`, {}, hasItems, { store: false }),
};
