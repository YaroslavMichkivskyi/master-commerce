import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Breadcrumbs, JsonLd, ListView } from '../../../components/storefront';
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
    <main>
      <JsonLd data={breadcrumbList(trail)} />
      <Breadcrumbs
        trail={trail.map((c, i) =>
          i < trail.length - 1 ? { name: c.name, href: c.path } : { name: c.name },
        )}
      />
      <h1>{category.name}</h1>
      {category.children.length > 0 ? (
        <ul className="subcategories">
          {category.children.map((c) => (
            <li key={c.slug}>
              <a href={`/c/${c.slug}`}>
                {c.name} <small>({c.productCount})</small>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <ListView path={path} params={query} list={list} />
    </main>
  );
}
