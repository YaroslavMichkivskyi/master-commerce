import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonLd } from '../lib/seo';
import { listPage, productPage, render, stubGateway } from '../test/gateway-stub';
import { generateMetadata as brandMeta } from './brands/[slug]/page';
import { generateMetadata as categoryMeta } from './c/[slug]/page';
import ProductPage, { generateMetadata as productMeta } from './p/[slug]/page';
import robots from './robots';
import { generateMetadata as searchMeta } from './search/page';
import { GET as sitemapIndex } from './sitemap.xml/route';
import { GET as sitemapFile } from './sitemaps/[file]/route';

// What search engines read (TASK-6 FR-040…FR-042, research R-8).

const C = '/api/v1/catalog';
const at = (slug: string, query: Record<string, string> = {}) => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve(query),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('metadata of list pages (FR-040)', () => {
  const list = { [`${C}/categories/graphics-cards/products`]: { body: listPage() } };

  it('indexes an unfiltered list with its own canonical and a description', async () => {
    stubGateway(list);
    const meta = await categoryMeta(at('graphics-cards'));
    expect(meta.title).toBe('Graphics cards');
    expect(meta.description).toContain('50 products');
    expect(meta.alternates?.canonical).toBe('/c/graphics-cards');
    expect(meta.robots).toBeUndefined();
  });

  it('indexes a numbered page with a canonical of its own', async () => {
    stubGateway({
      [`${C}/categories/graphics-cards/products`]: { body: listPage({ page: 2 }) },
    });
    const meta = await categoryMeta(at('graphics-cards', { page: '2' }));
    expect(meta.alternates?.canonical).toBe('/c/graphics-cards?page=2');
    expect(meta.title).toBe('Graphics cards — page 2');
    expect(meta.robots).toBeUndefined();
  });

  it('asks not to index a filtered or sorted list, pointing to the unfiltered one', async () => {
    stubGateway(list);
    const queries: Record<string, string>[] = [
      { brand: 'asus' },
      { sort: 'price-asc' },
      { brand: 'asus', page: '2' },
    ];
    for (const query of queries) {
      const meta = await categoryMeta(at('graphics-cards', query));
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe('/c/graphics-cards');
    }
  });

  it('gives a brand page the same rules, and never indexes search', async () => {
    stubGateway({
      [`${C}/brands/asus/products`]: {
        body: listPage({ category: undefined, brand: { id: 'b', name: 'ASUS', slug: 'asus' } }),
      },
    });
    expect((await brandMeta(at('asus'))).alternates?.canonical).toBe('/brands/asus');
    const search = await searchMeta({ searchParams: Promise.resolve({ q: 'rtx' }) });
    expect(search.robots).toEqual({ index: false, follow: true });
    expect(search.title).toBe('Search: rtx');
  });

  it('marks an unavailable catalog noindex', async () => {
    stubGateway({});
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('down'))),
    );
    expect((await categoryMeta(at('graphics-cards'))).robots).toEqual({
      index: false,
      follow: true,
    });
  });
});

describe('the product page (FR-040, FR-041)', () => {
  it('has a canonical, a description and structured Product and BreadcrumbList data', async () => {
    stubGateway({ [`${C}/products/asus-tuf-6070`]: { body: productPage() } });
    const meta = await productMeta(at('asus-tuf-6070'));
    expect(meta.alternates?.canonical).toBe('/p/asus-tuf-6070');
    expect(meta.description).toMatch(/^ASUS TUF .* by ASUS, €649\.99 with VAT\. A graphics card/);

    const html = render(await ProductPage(at('asus-tuf-6070')));
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1]!) as Record<string, unknown>,
    );
    expect(blocks.map((b) => b['@type'])).toEqual(['Product', 'BreadcrumbList']);
    expect(blocks[0]).toMatchObject({
      name: 'ASUS TUF Gaming GeForce RTX 6070 12GB',
      sku: 'ASU-GRA-1X2',
      url: 'http://localhost:3000/p/asus-tuf-6070',
      brand: { '@type': 'Brand', name: 'ASUS' },
      offers: {
        price: '649.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
    });
    expect(blocks[1]!.itemListElement).toHaveLength(4);
  });

  it('can never close its script tag from a product name', async () => {
    const name = '</script><script>alert(1)</script> & co';
    stubGateway({ [`${C}/products/asus-tuf-6070`]: { body: productPage({ name }) } });
    const html = render(await ProductPage(at('asus-tuf-6070')));
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(jsonLd({ name })) as unknown).toEqual({ name });
  });

  it('uses SITE_URL for absolute addresses', async () => {
    vi.stubEnv('SITE_URL', 'https://shop.example/');
    stubGateway({ [`${C}/products/asus-tuf-6070`]: { body: productPage() } });
    expect(render(await ProductPage(at('asus-tuf-6070')))).toContain(
      '"url":"https://shop.example/p/asus-tuf-6070"',
    );
  });
});

describe('robots.txt and the sitemap (FR-042)', () => {
  const sitemap = {
    [`${C}/sitemap`]: {
      body: {
        categories: [{ slug: 'ssds', updatedAt: '2026-01-02T00:00:00.000Z' }],
        brands: [{ slug: 'a&b', updatedAt: '2026-01-03T00:00:00.000Z' }],
        productParts: 2,
      },
    },
    [`${C}/sitemap/products/1`]: {
      body: { items: [{ slug: 'x-1', updatedAt: '2026-01-04T00:00:00.000Z' }] },
    },
    [`${C}/sitemap/products/2`]: { body: { items: [] } },
  };
  const file = (name: string) =>
    sitemapFile(new Request('http://localhost/'), { params: Promise.resolve({ file: name }) });

  it('keeps search out and names the sitemap', () => {
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/search' },
      sitemap: 'http://localhost:3000/sitemap.xml',
    });
  });

  it('lists the pages file and every product part in the index', async () => {
    stubGateway(sitemap);
    const res = await sitemapIndex();
    expect(res.headers.get('content-type')).toContain('application/xml');
    const xml = await res.text();
    expect(xml).toContain('<loc>http://localhost:3000/sitemaps/pages.xml</loc>');
    expect(xml).toContain('<loc>http://localhost:3000/sitemaps/products-0.xml</loc>');
    expect(xml).toContain('<loc>http://localhost:3000/sitemaps/products-1.xml</loc>');
    expect(xml).not.toContain('products-2.xml');
  });

  it('lists home, categories and brands, escaped, with their dates', async () => {
    stubGateway(sitemap);
    const xml = await (await file('pages.xml')).text();
    expect(xml).toContain('<url><loc>http://localhost:3000/</loc></url>');
    expect(xml).toContain(
      '<loc>http://localhost:3000/c/ssds</loc><lastmod>2026-01-02T00:00:00.000Z</lastmod>',
    );
    expect(xml).toContain('<loc>http://localhost:3000/brands/a&amp;b</loc>');
  });

  it('lists the products of a part; an empty, unknown or malformed part is not found', async () => {
    const seen = stubGateway(sitemap);
    expect(await (await file('products-1.xml')).text()).toContain(
      '<loc>http://localhost:3000/p/x-1</loc>',
    );
    // A part is not kept in the data cache (it is too large for it).
    expect(seen.at(-1)!.init.cache).toBe('no-store');
    expect((await file('products-2.xml')).status).toBe(404);
    expect((await file('products-x.xml')).status).toBe(404);
    expect((await file('../secret')).status).toBe(404);
  });

  it('answers 503 when the catalog is unavailable', async () => {
    stubGateway({});
    expect((await sitemapIndex()).status).toBe(503);
    expect((await file('pages.xml')).status).toBe(503);
  });
});
