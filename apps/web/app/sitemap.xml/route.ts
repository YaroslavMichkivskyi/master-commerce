import { catalog } from '../../lib/catalog';
import { sitemapIndex, xmlResponse } from '../../lib/seo';

// The sitemap index: one file of pages (home, categories, brands) and the products in
// parts of at most 50 000 addresses (FR-042). Read per request: the number of parts
// follows the catalog, and a build has no catalog to ask.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const answer = await catalog.sitemap();
  if (answer.kind !== 'ok') return new Response('Unavailable', { status: 503 });
  const parts = Array.from(
    { length: answer.data.productParts },
    (_, i) => `/sitemaps/products-${i}.xml`,
  );
  return xmlResponse(sitemapIndex(['/sitemaps/pages.xml', ...parts]));
}
