import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ListView, Unavailable } from '../../components/storefront';
import { catalog } from '../../lib/catalog';
import { flatten, href, normaliseRanges, type SearchParams } from '../../lib/query';
import { noindex } from '../../lib/seo';

interface Props {
  searchParams: Promise<SearchParams>;
}

/** Search pages are never indexed (FR-040, robots.txt too). */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = flatten(await searchParams).q?.trim();
  return noindex(q ? `Search: ${q.slice(0, 80)}` : 'Search');
}

/** Search results, filtered and paged like a category (FR-030, US-3). */
export default async function SearchPage({ searchParams }: Props) {
  const query = await searchParams;
  const ranges = normaliseRanges(query);
  if (ranges) redirect(href('/search', ranges, {}));
  const q = flatten(query).q?.trim() ?? '';

  const answer = q ? await catalog.search(query) : undefined;
  if (answer?.kind === 'unavailable') {
    return (
      <main>
        <Unavailable />
      </main>
    );
  }
  const list = answer?.kind === 'ok' ? answer.data : undefined;
  if (list && list.total > 0) {
    return (
      <main>
        <h1>Results for “{list.query}”</h1>
        <ListView path="/search" params={query} list={list} search />
      </main>
    );
  }

  // Nothing found, or nothing searched: suggest the categories (US-3).
  const tree = await catalog.tree();
  return (
    <main>
      <h1>{q ? `Nothing found for “${q}”` : 'Search'}</h1>
      <p>
        {q
          ? 'Check the spelling, use fewer words, or browse the categories:'
          : 'Type what you are looking for above, or browse the categories:'}
      </p>
      {tree.kind === 'ok' ? (
        <ul className="subcategories">
          {tree.data.items.map((c) => (
            <li key={c.id}>
              <a href={`/c/${c.slug}`}>{c.name}</a>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
