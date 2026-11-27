import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogUnavailableError } from '../lib/catalog';
import { listPage, productPage, render, stubGateway, thrown } from '../test/gateway-stub';
import ErrorPage from './error';
import BrandPage from './brands/[slug]/page';
import CategoryPage from './c/[slug]/page';
import ProductPage from './p/[slug]/page';
import HomePage from './page';
import SearchPage from './search/page';

// The error page asks for the router; redirect() and notFound() stay the real ones.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: () => {} }),
}));

// The storefront pages rendered on the server from a stubbed gateway (TASK-6 FR-030…FR-035).

const C = '/api/v1/catalog';
const category = (slug: string, query: Record<string, string> = {}) =>
  CategoryPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(query) });

afterEach(() => vi.unstubAllGlobals());

describe('home', () => {
  it('shows the top categories with their counts and the newest products', async () => {
    const seen = stubGateway({
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
    // The newest products are cached although their request has a limit.
    expect(seen.find((s) => s.url.pathname.endsWith('/new'))!.init.next).toEqual({
      revalidate: 300,
    });
    expect(html).toContain('href="/c/components"');
    expect(html).toContain('120 products');
    expect(html).toContain('New in');
    expect(html).toContain('€649.99');
  });

  it('fails with CatalogUnavailableError when the gateway fails, so the answer is a 5xx', async () => {
    stubGateway({ [`${C}/categories`]: { status: 503, body: { status: 503 } } });
    await expect(HomePage()).rejects.toBeInstanceOf(CatalogUnavailableError);
    // …and the error page says so, without details.
    const html = render(<ErrorPage error={new CatalogUnavailableError()} reset={() => {}} />);
    expect(html).toContain('The catalog is unavailable right now');
    expect(html).not.toContain('CatalogUnavailableError');
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

  it('drops only the fields the catalog refused and keeps the other filters', async () => {
    stubGateway({
      [`${C}/categories/graphics-cards/products`]: {
        status: 400,
        body: { status: 400, errors: [{ field: 'price', messages: ['…'] }] },
      },
    });
    expect(
      await thrown(() =>
        category('graphics-cards', { brand: 'palit', price: '1.234-', sort: 'name', page: '3' }),
      ),
    ).toBe('NEXT_REDIRECT;replace;/c/graphics-cards?brand=palit&page=3&sort=name;307;');
  });

  it('ticks one category at a time on a list with a category facet', async () => {
    stubGateway({
      [`${C}/search`]: {
        body: listPage({
          category: undefined,
          query: 'corsair',
          facets: [
            {
              code: 'category',
              name: 'Category',
              kind: 'values',
              values: [
                { value: 'memory', label: 'Memory', count: 4, selected: true },
                { value: 'power-supplies', label: 'Power supplies', count: 3, selected: false },
              ],
            },
          ],
        }),
      },
    });
    const html = render(
      await SearchPage({ searchParams: Promise.resolve({ q: 'corsair', category: 'memory' }) }),
    );
    expect(html).toContain('href="/search?category=power-supplies&amp;q=corsair"');
    expect(html).toContain('href="/search?q=corsair"');
    expect(html).not.toContain('memory%2Cpower-supplies');
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

  it('keeps the list and its facets when filters narrow a search to nothing', async () => {
    stubGateway({
      [`${C}/search`]: {
        body: listPage({ total: 0, items: [], pageCount: 1, category: undefined, query: 'rtx' }),
      },
    });
    const html = render(
      await SearchPage({ searchParams: Promise.resolve({ q: 'rtx', brand: 'asus' }) }),
    );
    expect(html).not.toContain('Nothing found');
    expect(html).toContain('No products match these filters.');
    expect(html).toContain('href="/search?q=rtx"'); // the ticked brand unticks
  });

  it('drops a refused filter of a search and keeps the query', async () => {
    stubGateway({
      [`${C}/search`]: {
        status: 400,
        body: { status: 400, errors: [{ field: 'category', messages: ['…'] }] },
      },
    });
    expect(
      await thrown(() =>
        SearchPage({ searchParams: Promise.resolve({ q: 'corsair', category: 'a,b' }) }),
      ),
    ).toBe('NEXT_REDIRECT;replace;/search?q=corsair;307;');
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
    // A tracking parameter is not a filter: still "nothing found".
    expect(
      render(await SearchPage({ searchParams: Promise.resolve({ q: 'zzz', utm_source: 'mail' }) })),
    ).toContain('Nothing found for “zzz”');
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
