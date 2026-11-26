import type { StorefrontProductDto } from '@master-commerce/dto';
import type { Metadata } from 'next';
import { isFiltered, pageHref, type SearchParams } from './query';

// What search engines read (TASK-6 FR-040…FR-042, research R-8).

/** The public address of the shop; canonical URLs, structured data and sitemaps use it. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export const absolute = (path: string) => `${siteUrl()}${path}`;

const NOINDEX = { index: false, follow: true } as const;

/**
 * A list page (category, brand): an unfiltered page is indexable with its own canonical,
 * numbered pages included; anything else asks not to be indexed and points to the
 * unfiltered list (FR-040).
 */
export function listMetadata(
  path: string,
  query: SearchParams,
  page: number,
  meta: { title: string; description: string },
): Metadata {
  const filtered = isFiltered(query);
  return {
    title: page > 1 && !filtered ? `${meta.title} — page ${page}` : meta.title,
    description: meta.description,
    alternates: { canonical: filtered ? path : pageHref(path, {}, page) },
    ...(filtered ? { robots: NOINDEX } : {}),
  };
}

/** A page that is never indexed (search, unavailable), links still followed. */
export const noindex = (title: string, description?: string): Metadata => ({
  title,
  ...(description ? { description } : {}),
  robots: NOINDEX,
});

/** A description of at most 160 characters, cut at a word. */
export function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

/**
 * JSON for a `<script type="application/ld+json">`: `<`, `>` and `&` are escaped, so a
 * product name such as `</script><script>…` can never close the tag (R-8).
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export interface Crumb {
  name: string;
  path: string;
}

export const breadcrumbList = (trail: readonly Crumb[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: absolute(c.path),
  })),
});

export const productLd = (p: StorefrontProductDto) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: p.name,
  sku: p.sku,
  description: p.description,
  url: absolute(`/p/${p.slug}`),
  brand: { '@type': 'Brand', name: p.brand.name },
  category: [...p.category.path.map((c) => c.name), p.category.name].join(' > '),
  offers: {
    '@type': 'Offer',
    url: absolute(`/p/${p.slug}`),
    price: (p.priceCents / 100).toFixed(2),
    priceCurrency: 'EUR',
    availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
  },
});

const xmlEscape = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[c]};`,
  );

/** A sitemap file (sitemaps.org 0.9). */
export function urlset(entries: readonly { path: string; updatedAt?: string }[]): string {
  const urls = entries
    .map(
      (e) =>
        `<url><loc>${xmlEscape(absolute(e.path))}</loc>${
          e.updatedAt ? `<lastmod>${xmlEscape(e.updatedAt)}</lastmod>` : ''
        }</url>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}

/** A sitemap index listing sitemap files. */
export function sitemapIndex(paths: readonly string[]): string {
  const items = paths
    .map((p) => `<sitemap><loc>${xmlEscape(absolute(p))}</loc></sitemap>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>\n`;
}

export const xmlResponse = (body: string) =>
  new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
