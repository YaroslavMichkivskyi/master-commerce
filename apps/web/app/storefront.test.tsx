import { afterEach, describe, expect, it, vi } from 'vitest';
import { listPage, productPage, render, stubGateway, thrown } from '../test/gateway-stub';
import BrandPage from './brands/[slug]/page';
import CategoryPage from './c/[slug]/page';
import ProductPage from './p/[slug]/page';
import HomePage from './page';
import SearchPage from './search/page';

// The storefront pages rendered on the server from a stubbed gateway (TASK-6 FR-030…FR-035).

const C = '/api/v1/catalog';
const category = (slug: string, query: Record<string, string> = {}) =>
  CategoryPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(query) });

afterEach(() => vi.unstubAllGlobals());

describe('home', () => {
  it('shows the top categories with their counts and the newest products', async () => {
    stubGateway({
      [`${C}/categories`]: {
        body: {
          items: [
            { id: '1', name: 'Components', slug: 'components', productCount: 120, children: [] },
          ],
        },
      },
      [`${C}/new`]: { body: { items: [listPage().items[0]] } },
    });
    const html = render(await HomePage());
    expect(html).toContain('href="/c/components"');
    expect(html).toContain('120 products');
    expect(html).toContain('New in');
    expect(html).toContain('€649.99');
  });

  it('shows "unavailable" when the gateway fails', async () => {
    stubGateway({ [`${C}/categories`]: { status: 503, body: { status: 503 } } });
    expect(render(await HomePage())).toContain('The catalog is unavailable right now');
  });
});

describe('a category page', () => {
  it('renders breadcrumbs, facets as links, cards and numbered pages', async () => {
    const seen = stubGateway({ [`${C}/categories/graphics-cards/products`]: { body: listPage() } });
    const html = render(await category('graphics-cards', { brand: 'asus' }));
    expect(html).toContain('<a href="/c/components">Components</a>');
    expect(html).toContain('<h1>Graphics cards</h1>');
    expect(html).toContain('50 products');
    // A ticked value unticks; another value is added to the list; both reset the page.
    expect(html).toContain('href="/c/graphics-cards"');
    expect(html).toContain('href="/c/graphics-cards?brand=asus%2Cmsi"');
    expect(html).toContain('href="/c/graphics-cards?brand=asus&amp;page=2"');
    expect(html).toContain('Out of stock');
    expect(html).toContain('name="price.min"');
    // A filtered list is fetched per request, the query passed on (R-6).
    expect(seen[0]!.url.searchParams.get('brand')).toBe('asus');
    expect(seen[0]!.init.cache).toBe('no-store');
  });

  it('caches an unfiltered list for 5 minutes (FR-035)', async () => {
    const seen = stubGateway({ [`${C}/categories/graphics-cards/products`]: { body: listPage() } });
    await category('graphics-cards');
    expect(seen[0]!.init.next).toEqual({ revalidate: 300 });
  });

  it('redirects an old slug permanently to the current address with the query (FR-034)', async () => {
    stubGateway({ [`${C}/categories/video-cards/products`]: { body: listPage() } });
    const digest = await thrown(() => category('video-cards', { brand: 'asus', page: '2' }));
    expect(digest).toBe('NEXT_REDIRECT;replace;/c/graphics-cards?brand=asus&page=2;308;');
  });

  it('turns a range form into one parameter, and refused filters into the clean page', async () => {
    stubGateway({
      [`${C}/categories/graphics-cards/products`]: { status: 400, body: { status: 400 } },
    });
    expect(
      await thrown(() => category('graphics-cards', { 'price.min': '200', 'price.max': '' })),
    ).toBe('NEXT_REDIRECT;replace;/c/graphics-cards?price=200-;307;');
    expect(await thrown(() => category('graphics-cards', { page: 'abc' }))).toBe(
      'NEXT_REDIRECT;replace;/c/graphics-cards;307;',
    );
  });

  it('answers 404 for an unknown category', async () => {
    stubGateway({});
    expect(await thrown(() => category('nothing'))).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('a brand page', () => {
  it('renders the brand with a category facet and redirects an old slug', async () => {
    const brandList = listPage({
      category: undefined,
      brand: { id: 'b', name: 'ASUS', slug: 'asus' },
      facets: [
        {
          code: 'category',
          name: 'Category',
          kind: 'values',
          values: [{ value: 'ssds', label: 'SSDs', count: 4, selected: false }],
        },
      ],
    });
    stubGateway({
      [`${C}/brands/asus/products`]: { body: brandList },
      [`${C}/brands/asustek/products`]: { body: brandList },
    });
    const html = render(
      await BrandPage({
        params: Promise.resolve({ slug: 'asus' }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain('<h1>ASUS</h1>');
    expect(html).toContain('href="/brands/asus?category=ssds"');
    expect(
      await thrown(() =>
        BrandPage({
          params: Promise.resolve({ slug: 'asustek' }),
          searchParams: Promise.resolve({}),
        }),
      ),
    ).toBe('NEXT_REDIRECT;replace;/brands/asus;308;');
  });
});

describe('search', () => {
  it('shows results with the query as understood and relevance as the default sort', async () => {
    stubGateway({
      [`${C}/search`]: {
        body: listPage({ category: undefined, query: 'rtx 60', sort: 'relevance' }),
      },
    });
    const html = render(await SearchPage({ searchParams: Promise.resolve({ q: 'RTX 60' }) }));
    expect(html).toContain('Results for “rtx 60”');
    expect(html).toContain('<strong>Relevance</strong>');
  });

  it('suggests the categories when nothing is found or nothing is asked', async () => {
    stubGateway({
      [`${C}/search`]: { body: listPage({ total: 0, items: [], category: undefined }) },
      [`${C}/categories`]: {
        body: {
          items: [{ id: '1', name: 'Storage', slug: 'storage', productCount: 3, children: [] }],
        },
      },
    });
    const html = render(await SearchPage({ searchParams: Promise.resolve({ q: 'zzz' }) }));
    expect(html).toContain('Nothing found for “zzz”');
    expect(html).toContain('href="/c/storage"');
    expect(render(await SearchPage({ searchParams: Promise.resolve({}) }))).toContain(
      '<h1>Search</h1>',
    );
  });
});

describe('a product page (FR-033, AC #2)', () => {
  const product = (slug: string) => ProductPage({ params: Promise.resolve({ slug }) });

  it('renders the whole product: breadcrumbs, price with VAT, stock, specs', async () => {
    stubGateway({ [`${C}/products/asus-tuf-6070`]: { body: productPage() } });
    const html = render(await product('asus-tuf-6070'));
    expect(html).toContain('<a href="/c/graphics-cards">Graphics cards</a>');
    expect(html).toContain('€649.99');
    expect(html).toContain('VAT included');
    expect(html).toContain('In stock');
    expect(html).toContain('<th scope="row">Memory size</th><td>12 GB</td>');
    expect(html).toContain('<td>Yes</td>');
    expect(html).toContain('<td>HDMI 2.1, USB-C</td>');
  });

  it('redirects an old slug and answers 404 for an unknown product', async () => {
    stubGateway({ [`${C}/products/old-slug`]: { body: productPage() } });
    expect(await thrown(() => product('old-slug'))).toBe(
      'NEXT_REDIRECT;replace;/p/asus-tuf-6070;308;',
    );
    expect(await thrown(() => product('gone'))).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
