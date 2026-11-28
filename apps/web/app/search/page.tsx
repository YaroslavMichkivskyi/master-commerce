import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ListView } from '../../components/shop/list-view';
import { CategoryPills, PageHead } from '../../components/shop/page-head';
import { NothingFound } from '../../components/shop/states';
import { CatalogUnavailableError, catalog } from '../../lib/catalog';
import {
  flatten,
  href,
  normaliseRanges,
  type SearchParams,
  withoutDefaultSort,
  withoutRefused,
} from '../../lib/query';
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
  const plain = withoutDefaultSort('/search', query, true);
  if (plain) redirect(plain);
  const q = flatten(query).q?.trim() ?? '';

  const answer = q ? await catalog.search(query) : undefined;
  if (answer?.kind === 'unavailable') throw new CatalogUnavailableError();
  // A refused filter is dropped and the rest kept; a refused query is "nothing found".
  if (answer?.kind === 'invalid' && !answer.fields.includes('q'))
    redirect(withoutRefused('/search', query, answer.fields));
  const list = answer?.kind === 'ok' ? answer.data : undefined;
  // Filters that narrow a search to nothing keep the list view: its facets and empty state
  // are how they are taken off. "Nothing found" is for the words alone.
  // Only the filters search reads: a tracking parameter (`utm_source`, `gclid`) is not one.
  const narrowed = ['brand', 'price', 'stock', 'category'].some((k) => flatten(query)[k]);
  if (list && (list.total > 0 || narrowed)) {
    return (
      <>
        <PageHead title={`Results for “${list.query}”`} />
        <ListView path="/search" params={query} list={list} search />
      </>
    );
  }

  // Nothing found, or nothing searched: suggest the categories (US-3).
  const tree = await catalog.tree();
  return (
    <NothingFound
      query={q}
      suggestions={
        tree.kind === 'ok' ? (
          <CategoryPills items={tree.data.items} label="Categories" />
        ) : undefined
      }
    />
  );
}
