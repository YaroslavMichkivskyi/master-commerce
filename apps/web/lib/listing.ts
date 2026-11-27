import type { FacetDto } from '@master-commerce/dto';
import { flatten, href, rangeOf, type SearchParams, toggle } from './query';

// What the list controls show, computed from the address and the facets the catalog
// answered (FR-012, edge cases). Pure, so the links are tested without rendering.

/** A gap between page numbers. */
export const GAP = 'gap' as const;

/**
 * The page numbers to link: all of them up to 7 pages, else the first, the last and a
 * window of 5 around the current one, so the set stays short and of a stable size.
 */
export function pageNumbers(page: number, pageCount: number): (number | typeof GAP)[] {
  if (pageCount <= 1) return [];
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 2, pageCount - 5));
  const end = start + 4;
  return [
    1,
    ...(start > 2 ? [GAP] : []),
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    ...(end < pageCount - 1 ? [GAP] : []),
    pageCount,
  ];
}

/** The query value of a value facet with `value` switched (one category at a time). */
export function valueChange(facet: FacetDto, params: SearchParams, value: string, on: boolean) {
  if (facet.code === 'category') return on ? undefined : value;
  return toggle(flatten(params)[facet.code], value);
}

/** Price facets come in cents; the address and the form are in whole euros. */
export const isPrice = (facet: FacetDto) => facet.code === 'price';

export interface AppliedFilter {
  /** e.g. "Brand: ASUS", "Price: €100 – €500" */
  label: string;
  /** The same list without this filter, from page 1. */
  href: string;
}

function rangeLabel(facet: FacetDto, min?: string, max?: string) {
  const unit = (n: string) => (isPrice(facet) ? `€${n}` : facet.unit ? `${n} ${facet.unit}` : n);
  if (min && max) return `${unit(min)} – ${unit(max)}`;
  return min ? `from ${unit(min)}` : `up to ${unit(max!)}`;
}

/** The filters the address applies, each with the link that removes it (FR-012). */
export function appliedFilters(
  path: string,
  params: SearchParams,
  facets: readonly FacetDto[],
): AppliedFilter[] {
  const flat = flatten(params);
  const out: AppliedFilter[] = [];
  if (flat.stock === 'in') {
    out.push({ label: 'In stock only', href: href(path, params, { stock: undefined }) });
  }
  for (const facet of facets) {
    if (facet.kind === 'range') {
      const { min, max } = rangeOf(flat[facet.code]);
      if (min || max) {
        out.push({
          label: `${facet.name}: ${rangeLabel(facet, min, max)}`,
          href: href(path, params, { [facet.code]: undefined }),
        });
      }
      continue;
    }
    for (const v of facet.values ?? []) {
      if (!v.selected) continue;
      out.push({
        label: `${facet.name}: ${v.label}`,
        href: href(path, params, { [facet.code]: valueChange(facet, params, v.value, true) }),
      });
    }
  }
  return out;
}

/** The list without any filter; the search words and the sort stay. */
export function clearFiltersHref(path: string, params: SearchParams, facets: readonly FacetDto[]) {
  const codes = ['stock', ...facets.map((f) => f.code)];
  return href(path, params, Object.fromEntries(codes.map((c) => [c, undefined])));
}

const COUNT = new Intl.NumberFormat('en-IE');

/** "1 product", "1,234 products". */
export const productCount = (n: number) => `${COUNT.format(n)} ${n === 1 ? 'product' : 'products'}`;
