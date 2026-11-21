import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Breadcrumbs, ListView, Unavailable } from '../../../components/storefront';
import { catalog } from '../../../lib/catalog';
import { href, normaliseRanges, type SearchParams } from '../../../lib/query';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
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
      <Breadcrumbs
        trail={[{ name: 'Home', href: '/' }, { name: 'Brands' }, { name: brand.name }]}
      />
      <h1>{brand.name}</h1>
      <ListView path={path} params={query} list={list} />
    </main>
  );
}
