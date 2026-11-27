import type { ProductListPageDto } from '@master-commerce/dto';
import { appliedFilters, clearFiltersHref } from '../../lib/listing';
import type { SearchParams } from '../../lib/query';
import { Filters } from './filters';
import { AppliedChips, Pagination, ResultCount, SortControl } from './list-controls';
import { ProductGrid } from './product-card';
import { NoResults } from './states';

// The body of a category, brand or search list (FR-003, FR-012, FR-021): filters beside
// (or, on a phone, behind a button above) the result count, the applied chips, the sort,
// the products and the pages; a hint at the paging limit.

export function ListView({
  path,
  params,
  list,
  search = false,
}: {
  path: string;
  params: SearchParams;
  list: ProductListPageDto;
  search?: boolean;
}) {
  const applied = appliedFilters(path, params, list.facets);
  const clearHref = clearFiltersHref(path, params, list.facets);
  const shown = list.pageSize * list.pageCount;
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
      <Filters path={path} params={params} facets={list.facets} total={list.total} />
      <section aria-label="Products" className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultCount total={list.total} />
          <SortControl path={path} params={params} sort={list.sort} search={search} />
        </div>
        <AppliedChips filters={applied} clearHref={clearHref} />
        {list.items.length === 0 ? (
          <NoResults clearHref={clearHref} filtered={applied.length > 0} />
        ) : (
          <ProductGrid items={list.items} />
        )}
        <Pagination path={path} params={params} page={list.page} pageCount={list.pageCount} />
        {list.total > shown ? (
          <p className="text-center text-sm text-muted">
            Showing the first {shown} products — narrow the filters to see the others.
          </p>
        ) : null}
      </section>
    </div>
  );
}
