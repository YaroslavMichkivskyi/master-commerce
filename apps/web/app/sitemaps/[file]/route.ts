import { catalog } from '../../../lib/catalog';
import { urlset, xmlResponse } from '../../../lib/seo';

// One file of the sitemap: `pages.xml` or `products-<n>.xml` (FR-042).
export const dynamic = 'force-dynamic';

const PART = /^products-(\d{1,4})\.xml$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;

  if (file === 'pages.xml') {
    const answer = await catalog.sitemap();
    if (answer.kind !== 'ok') return new Response('Unavailable', { status: 503 });
    return xmlResponse(
      urlset([
        { path: '/' },
        ...answer.data.categories.map((c) => ({ path: `/c/${c.slug}`, updatedAt: c.updatedAt })),
        ...answer.data.brands.map((b) => ({ path: `/brands/${b.slug}`, updatedAt: b.updatedAt })),
      ]),
    );
  }

  const part = PART.exec(file);
  if (!part) return new Response('Not found', { status: 404 });
  const answer = await catalog.sitemapPart(Number(part[1]));
  if (answer.kind === 'not-found') return new Response('Not found', { status: 404 });
  if (answer.kind !== 'ok') return new Response('Unavailable', { status: 503 });
  // A part past the last one is empty: not a file of the sitemap.
  if (answer.data.items.length === 0) return new Response('Not found', { status: 404 });
  return xmlResponse(
    urlset(answer.data.items.map((p) => ({ path: `/p/${p.slug}`, updatedAt: p.updatedAt }))),
  );
}
