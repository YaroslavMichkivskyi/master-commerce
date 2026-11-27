import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { JsonLd } from '../../../components/shop/json-ld';
import { ListView } from '../../../components/shop/list-view';
import { PageHead } from '../../../components/shop/page-head';
import { CatalogUnavailableError, catalog } from '../../../lib/catalog';
import { href, normaliseRanges, type SearchParams, withoutRefused } from '../../../lib/query';
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
  if (answer.kind === 'invalid') redirect(withoutRefused(path, query, answer.fields));
  if (answer.kind === 'unavailable') throw new CatalogUnavailableError();
  const list = answer.data;
  const brand = list.brand!;
  if (brand.slug !== slug)
    permanentRedirect(href(`/brands/${brand.slug}`, query, {}, { keepPage: true }));

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: brand.name, path },
        ])}
      />
      <PageHead
        trail={[{ name: 'Home', href: '/' }, { name: 'Brands' }, { name: brand.name }]}
        title={brand.name}
      />
      <ListView path={path} params={query} list={list} />
    </>
  );
}
