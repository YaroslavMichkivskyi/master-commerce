import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Breadcrumbs, JsonLd, ListView, Unavailable } from '../../../components/storefront';
import { catalog } from '../../../lib/catalog';
import { href, normaliseRanges, type SearchParams } from '../../../lib/query';
import { breadcrumbList, listMetadata, noindex } from '../../../lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const answer = await catalog.brand(slug, query);
  if (answer.kind === 'unavailable') return noindex('Unavailable');
  if (answer.kind !== 'ok') return {};
  const { brand, total, page } = answer.data;
  return listMetadata(`/brands/${brand!.slug}`, query, page, {
    title: brand!.name,
    description: `${brand!.name}: ${total} ${total === 1 ? 'product' : 'products'}. Compare prices with VAT, specifications and availability.`,
  });
}

/** A brand's products with a category facet (FR-030). */
export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const path = `/brands/${slug}`;
  const ranges = normaliseRanges(query);
  if (ranges) redirect(href(path, ranges, {}));

  const answer = await catalog.brand(slug, query);
  if (answer.kind === 'not-found') notFound();
  if (answer.kind === 'invalid') redirect(path);
  if (answer.kind === 'unavailable') {
    return (
      <main>
        <Unavailable />
      </main>
    );
  }
  const list = answer.data;
  const brand = list.brand!;
  if (brand.slug !== slug)
    permanentRedirect(href(`/brands/${brand.slug}`, query, {}, { keepPage: true }));

  return (
    <main>
      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: brand.name, path },
        ])}
      />
      <Breadcrumbs
        trail={[{ name: 'Home', href: '/' }, { name: 'Brands' }, { name: brand.name }]}
      />
      <h1>{brand.name}</h1>
      <ListView path={path} params={query} list={list} />
    </main>
  );
}
