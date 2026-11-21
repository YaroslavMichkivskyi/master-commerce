import type {
  ProductCardListDto,
  ProductListPageDto,
  SitemapDto,
  SitemapPartDto,
  StorefrontProductDto,
  StorefrontTreeDto,
} from '@master-commerce/dto';
import { gatewayUrl } from './gateway';
import type { SearchParams } from './query';

// The storefront API of the gateway (TASK-6 FR-020), server side only. Unfiltered pages
// are cached for 5 minutes; anything with a query is fetched per request (research R-6).

export const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 3000;

export type Answer<T> =
  { kind: 'ok'; data: T } | { kind: 'not-found' } | { kind: 'invalid' } | { kind: 'unavailable' };

async function get<T>(
  path: string,
  query: SearchParams = {},
  check?: (body: unknown) => boolean,
): Promise<Answer<T>> {
  const url = new URL(`/api/v1/catalog${path}`, gatewayUrl());
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      url.searchParams.append(key, v);
    }
  }
  const filtered = url.searchParams.size > 0;
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(filtered ? { cache: 'no-store' as const } : { next: { revalidate: REVALIDATE_SECONDS } }),
    });
    if (res.status === 404) return { kind: 'not-found' };
    if (res.status === 400) return { kind: 'invalid' };
    if (!res.ok) return { kind: 'unavailable' };
    const body: unknown = await res.json();
    // A 200 of another shape (a proxy, a foreign process) is "unavailable", never a crash.
    if (typeof body !== 'object' || body === null || (check && !check(body)))
      return { kind: 'unavailable' };
    return { kind: 'ok', data: body as T };
  } catch {
    return { kind: 'unavailable' };
  }
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
  sitemap: () => get<SitemapDto>('/sitemap'),
  sitemapPart: (part: number) => get<SitemapPartDto>(`/sitemap/products/${part}`, {}, hasItems),
};
