import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { JsonLd } from '../../../components/shop/json-ld';
import { ListView } from '../../../components/shop/list-view';
import { CategoryPills, PageHead } from '../../../components/shop/page-head';
import { CatalogUnavailableError, catalog } from '../../../lib/catalog';
import {
  href,
  normaliseRanges,
  type SearchParams,
  withoutDefaultSort,
  withoutRefused,
} from '../../../lib/query';
import { breadcrumbList, listMetadata, noindex } from '../../../lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const answer = await catalog.category(slug, query);
  if (answer.kind === 'unavailable') return noindex('Unavailable');
  if (answer.kind !== 'ok') return {};
  const { category, total, page } = answer.data;
  return listMetadata(`/c/${category!.slug}`, query, page, {
    title: category!.name,
    description: `${category!.name}: ${total} ${total === 1 ? 'product' : 'products'}. Compare prices with VAT, specifications and availability.`,
  });
}

/** A category with everything below it, filtered from the address (FR-030…FR-032). */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const path = `/c/${slug}`;
  const ranges = normaliseRanges(query);
  if (ranges) redirect(href(path, ranges, {}));
  const plain = withoutDefaultSort(path, query);
  if (plain) redirect(plain);

  const answer = await catalog.category(slug, query);
  if (answer.kind === 'not-found') notFound();
  // Filters the catalog refuses (a hand-edited address): the unfiltered page.
  if (answer.kind === 'invalid') redirect(withoutRefused(path, query, answer.fields));
  if (answer.kind === 'unavailable') throw new CatalogUnavailableError();
  const list = answer.data;
  const category = list.category!;
  // An old slug: the current address, with the same query (FR-034).
  if (category.slug !== slug)
    permanentRedirect(href(`/c/${category.slug}`, query, {}, { keepPage: true }));

  const trail = [
    { name: 'Home', path: '/' },
    ...category.path.map((c) => ({ name: c.name, path: `/c/${c.slug}` })),
    { name: category.name, path },
  ];
  return (
    <>
      <JsonLd data={breadcrumbList(trail)} />
      <PageHead
        trail={trail.map((c, i) =>
          i < trail.length - 1 ? { name: c.name, href: c.path } : { name: c.name },
        )}
        title={category.name}
      >
        <CategoryPills items={category.children} label="Subcategories" />
      </PageHead>
      <ListView path={path} params={query} list={list} />
    </>
  );
}
