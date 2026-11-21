import type {
  ProductCardDto,
  ProductListPageDto,
  StorefrontProductDto,
} from '@master-commerce/dto';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

// A stubbed gateway for rendering server components: each answer by its path.

export interface Seen {
  url: URL;
  init: RequestInit & { next?: { revalidate?: number } };
}

export function stubGateway(answers: Record<string, { status?: number; body: unknown }>): Seen[] {
  const seen: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: URL | string, init: Seen['init'] = {}) => {
      const url = new URL(String(input));
      seen.push({ url, init });
      const answer = answers[url.pathname];
      if (!answer) return Promise.resolve(new Response('{}', { status: 404 }));
      return Promise.resolve(
        new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 }),
      );
    }),
  );
  return seen;
}

export const render = (element: ReactElement) => renderToStaticMarkup(element);

/** What `redirect()` / `permanentRedirect()` / `notFound()` threw, or `undefined`. */
export async function thrown(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === 'string') return digest;
    throw error;
  }
}

export const card = (over: Partial<ProductCardDto> = {}): ProductCardDto => ({
  id: '1',
  name: 'ASUS TUF Gaming GeForce RTX 6070 12GB',
  slug: 'asus-tuf-gaming-geforce-rtx-6070-12gb-1x2',
  brand: { name: 'ASUS', slug: 'asus' },
  priceCents: 64999,
  inStock: true,
  highlights: [{ name: 'Memory size', value: '12 GB' }],
  ...over,
});

export const listPage = (over: Partial<ProductListPageDto> = {}): ProductListPageDto => ({
  category: {
    id: 'c',
    name: 'Graphics cards',
    slug: 'graphics-cards',
    path: [{ name: 'Components', slug: 'components' }],
    children: [],
  },
  items: [card(), card({ id: '2', slug: 'b-2', name: 'MSI Ventus RTX 6060', inStock: false })],
  total: 50,
  page: 1,
  pageSize: 24,
  pageCount: 3,
  sort: 'new',
  facets: [
    {
      code: 'brand',
      name: 'Brand',
      kind: 'values',
      values: [
        { value: 'asus', label: 'ASUS', count: 30, selected: true },
        { value: 'msi', label: 'MSI', count: 20, selected: false },
      ],
    },
    { code: 'price', name: 'Price', kind: 'range', unit: 'EUR cents', min: 19999, max: 199999 },
    { code: 'memory_size', name: 'Memory size', kind: 'range', unit: 'GB', min: 8, max: 32 },
  ],
  ...over,
});

export const productPage = (over: Partial<StorefrontProductDto> = {}): StorefrontProductDto => ({
  id: '1',
  name: 'ASUS TUF Gaming GeForce RTX 6070 12GB',
  slug: 'asus-tuf-6070',
  sku: 'ASU-GRA-1X2',
  description: 'A graphics card for gaming.',
  brand: { name: 'ASUS', slug: 'asus' },
  category: {
    name: 'Graphics cards',
    slug: 'graphics-cards',
    path: [{ name: 'Components', slug: 'components' }],
  },
  priceCents: 64999,
  inStock: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
  specs: [
    { code: 'memory_size', name: 'Memory size', type: 'number', unit: 'GB', value: 12 },
    { code: 'ray_tracing', name: 'Ray tracing', type: 'boolean', value: true },
    { code: 'outputs', name: 'Outputs', type: 'multi_select', value: ['HDMI 2.1', 'USB-C'] },
  ],
  ...over,
});
