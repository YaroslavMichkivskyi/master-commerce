import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Breadcrumbs, ListView, Unavailable } from '../../../components/storefront';
import { catalog } from '../../../lib/catalog';
import { href, normaliseRanges, type SearchParams } from '../../../lib/query';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
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
  if (answer.kind === 'invalid') redirect(path);
  if (answer.kind === 'unavailable') {
    return (
      <main>
        <Unavailable />
      </main>
    );
  }
  const list = answer.data;
  const category = list.category!;
  // An old slug: the current address, with the same query (FR-034).
  if (category.slug !== slug)
    permanentRedirect(href(`/c/${category.slug}`, query, {}, { keepPage: true }));

  return (
    <main>
      <Breadcrumbs
        trail={[
          { name: 'Home', href: '/' },
          ...category.path.map((c) => ({ name: c.name, href: `/c/${c.slug}` })),
          { name: category.name },
        ]}
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
