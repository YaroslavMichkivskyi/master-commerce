import { type AppliedFilter, formatCount, GAP, pageNumbers, productCount } from '../../lib/listing';
import { pageHref, type SearchParams } from '../../lib/query';
import { Button, buttonClass } from '../ui/button';
import { cx } from '../ui/cx';
import { ChevronRightIcon, CloseIcon } from '../ui/icons';
import { Select } from '../ui/input';
import { KeepQuery } from './filters';

// The controls around a list (FR-003, FR-012, FR-021, edge cases): breadcrumbs, the result
// count, applied-filter chips, the sort form and the pages. All links and GET forms.

export interface Crumb {
  name: string;
  href?: string;
}

export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted">
        {trail.map((c, i) => (
          <li key={`${c.name}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <ChevronRightIcon className="size-4" /> : null}
            {c.href ? (
              <a
                href={c.href}
                className="inline-flex min-h-6 items-center text-muted hover:text-accent"
              >
                {c.name}
              </a>
            ) : (
              <span aria-current="page" className="text-text">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The number of products found and which of them this page shows ("25–48", "page 2 of
 * 100"), announced when it changes (FR-021).
 */
export function ResultCount({
  total,
  page = 1,
  pageSize = 0,
  pageCount = 1,
  shown = 0,
}: {
  total: number;
  page?: number;
  pageSize?: number;
  pageCount?: number;
  shown?: number;
}) {
  const first = (page - 1) * pageSize + 1;
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col">
      <h2 className="figures text-base font-semibold text-text">{productCount(total)}</h2>
      {shown > 0 && pageCount > 1 ? (
        <p className="figures text-sm text-muted">
          {formatCount(first)}–{formatCount(first + shown - 1)} shown
          {page > 1 ? `, page ${page} of ${pageCount}` : ''}
        </p>
      ) : null}
    </div>
  );
}

/** The applied filters as removable chips, and a link that clears them all (FR-012). */
export function AppliedChips({
  filters,
  clearHref,
}: {
  filters: readonly AppliedFilter[];
  clearHref: string;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <li key={f.href}>
            <a
              href={f.href}
              rel="nofollow"
              className="inline-flex min-h-8 items-center gap-1 rounded-pill bg-accent-soft py-1 pr-2 pl-3 text-sm font-medium text-accent no-underline hover:bg-surface-2"
            >
              {f.label}
              <CloseIcon className="size-4" />
              <span className="sr-only">, remove</span>
            </a>
          </li>
        ))}
      </ul>
      {filters.length > 1 ? (
        <a href={clearHref} rel="nofollow" className="inline-flex min-h-8 items-center text-sm">
          Clear all
        </a>
      ) : null}
    </div>
  );
}

export const SORT_LABELS: Record<string, string> = {
  relevance: 'Relevance',
  new: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name',
};

/** A GET form, so it works without JavaScript; a new sort goes back to page 1. */
export function SortControl({
  path,
  params,
  sort,
  search,
}: {
  path: string;
  params: SearchParams;
  sort: string;
  search: boolean;
}) {
  const options = search
    ? ['relevance', 'new', 'price-asc', 'price-desc', 'name']
    : ['new', 'price-asc', 'price-desc', 'name'];
  return (
    <form method="get" action={path} className="flex items-center gap-2">
      <KeepQuery params={params} except={['sort']} />
      <label htmlFor="sort" className="text-sm text-muted">
        Sort
      </label>
      <Select id="sort" name="sort" defaultValue={sort} className="text-sm">
        {options.map((o) => (
          <option key={o} value={o}>
            {SORT_LABELS[o]}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}

const PAGE = 'inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm';

/** A short set of page numbers of a stable size; nothing for a single page. */
export function Pagination({
  path,
  params,
  page,
  pageCount,
}: {
  path: string;
  params: SearchParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const step = (to: number, rel: 'prev' | 'next', label: string, enabled: boolean) => {
    const icon = <ChevronRightIcon className={cx('size-4', rel === 'prev' && 'rotate-180')} />;
    const body =
      rel === 'prev' ? (
        <>
          {icon}
          <span className="max-sm:sr-only">{label}</span>
        </>
      ) : (
        <>
          <span className="max-sm:sr-only">{label}</span>
          {icon}
        </>
      );
    return enabled ? (
      <a href={pageHref(path, params, to)} rel={rel} className={buttonClass('ghost', 'md')}>
        {body}
      </a>
    ) : (
      <span aria-disabled="true" className={cx(buttonClass('ghost', 'md'), 'opacity-50')}>
        {body}
      </span>
    );
  };
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1">
      {step(page - 1, 'prev', 'Previous', page > 1)}
      <ul className="figures flex flex-wrap items-center gap-1">
        {pageNumbers(page, pageCount).map((p, i) =>
          p === GAP ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              {p === page ? (
                <span
                  aria-current="page"
                  className={cx(PAGE, 'bg-accent font-semibold text-on-accent')}
                >
                  {p}
                </span>
              ) : (
                <a
                  href={pageHref(path, params, p)}
                  className={cx(PAGE, 'text-text no-underline hover:bg-surface-2')}
                >
                  {p}
                </a>
              )}
            </li>
          ),
        )}
      </ul>
      {step(page + 1, 'next', 'Next', page < pageCount)}
    </nav>
  );
}
