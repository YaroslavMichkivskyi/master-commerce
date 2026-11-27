import type { FacetDto, FacetValueDto } from '@master-commerce/dto';
import type { ReactNode } from 'react';
import { appliedFilters, isPrice, productCount, valueChange } from '../../lib/listing';
import { flatten, href, rangeOf, type SearchParams } from '../../lib/query';
import { CountBadge } from '../ui/badge';
import { Button, ButtonLink, buttonClass } from '../ui/button';
import { CheckBox, Selected } from '../ui/check-box';
import { cx } from '../ui/cx';
import { CloseIcon, FilterIcon } from '../ui/icons';
import { RangeFields } from '../ui/input';
import { FilterPanelEnhancer } from './filter-panel-enhancer';

// The filters of a list (FR-003, FR-012, FR-013, R-6). A value is a link and a range a GET
// form, as in TASK-6, so every state has an address and works without JavaScript. From
// 768 px the panel is a column beside the list; on a phone one "Filters" button (a
// <details>, with the applied count) opens it full-screen, and `FilterPanelEnhancer` makes
// it modal when JavaScript runs.

/** Values shown before "Show all (N)". */
export const VISIBLE_VALUES = 8;

const OPTION =
  'flex min-h-8 items-center gap-2 rounded-sm text-sm text-text no-underline hover:text-accent';

function ValueLink({
  path,
  params,
  facet,
  value,
}: {
  path: string;
  params: SearchParams;
  facet: FacetDto;
  value: FacetValueDto;
}) {
  return (
    <li>
      <a
        href={href(path, params, {
          [facet.code]: valueChange(facet, params, value.value, value.selected),
        })}
        rel="nofollow"
        className={cx(OPTION, value.count === 0 && !value.selected && 'text-muted')}
      >
        <CheckBox checked={value.selected} />
        <span className="min-w-0 flex-1 wrap-break-word">
          {value.label}
          <Selected checked={value.selected} />
        </span>
        <span className="figures text-xs text-muted">{value.count}</span>
      </a>
    </li>
  );
}

function ValueFacet({
  path,
  params,
  facet,
}: {
  path: string;
  params: SearchParams;
  facet: FacetDto;
}) {
  const values = facet.values ?? [];
  const first = values.slice(0, VISIBLE_VALUES);
  const rest = values.slice(VISIBLE_VALUES);
  const link = (v: FacetValueDto) => (
    <ValueLink key={v.value} path={path} params={params} facet={facet} value={v} />
  );
  return (
    <>
      <ul className="flex flex-col gap-0.5">{first.map(link)}</ul>
      {rest.length > 0 ? (
        // Open when a value in the hidden part is selected, so the selection shows.
        // Open, the summary moves under the list and reads "Show less" (a browser that cannot
        // lay out <details> as flex keeps it above).
        <details
          className="group mt-1 flex flex-col"
          open={rest.some((v) => v.selected) || undefined}
        >
          <summary className="inline-flex min-h-8 items-center self-start text-sm font-semibold text-accent group-open:order-last">
            <span className="group-open:hidden">Show all ({values.length})</span>
            <span className="hidden group-open:inline">Show less</span>
          </summary>
          <ul className="flex flex-col gap-0.5">{rest.map(link)}</ul>
        </details>
      ) : null}
    </>
  );
}

/** Hidden inputs that keep the rest of the query in a GET form. */
export function KeepQuery({ params, except }: { params: SearchParams; except: readonly string[] }) {
  return (
    <>
      {Object.entries(flatten(params))
        .filter(([k]) => !except.includes(k) && k !== 'page')
        .map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
    </>
  );
}

function RangeFacet({
  path,
  params,
  facet,
}: {
  path: string;
  params: SearchParams;
  facet: FacetDto;
}) {
  const price = isPrice(facet);
  const selected = rangeOf(flatten(params)[facet.code]);
  const show = (n: number | undefined, round: (x: number) => number) =>
    n === undefined ? undefined : price ? String(round(n / 100)) : String(n);
  return (
    <form method="get" action={path} className="flex flex-col gap-2">
      <KeepQuery params={params} except={[facet.code]} />
      <RangeFields
        code={facet.code}
        unit={price ? '€' : facet.unit}
        min={selected.min}
        max={selected.max}
        placeholderMin={show(facet.min, Math.floor)}
        placeholderMax={show(facet.max, Math.ceil)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
        {selected.min || selected.max ? (
          <a href={href(path, params, { [facet.code]: undefined })} className="text-sm">
            Clear<span className="sr-only"> {facet.name}</span>
          </a>
        ) : null}
      </div>
    </form>
  );
}

function Group({ title, code, children }: { title: string; code?: string; children: ReactNode }) {
  const id = `facet-${code ?? 'stock'}`;
  return (
    <section
      data-facet={code}
      aria-labelledby={id}
      className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0"
    >
      <h3 id={id} className="text-sm font-semibold text-text">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FacetGroups({
  path,
  params,
  facets,
}: {
  path: string;
  params: SearchParams;
  facets: readonly FacetDto[];
}) {
  const inStock = flatten(params).stock === 'in';
  return (
    <div className="flex flex-col gap-4">
      <Group title="Availability">
        <a
          href={href(path, params, { stock: inStock ? undefined : 'in' })}
          rel="nofollow"
          className={OPTION}
        >
          <CheckBox checked={inStock} />
          <span>
            In stock only
            <Selected checked={inStock} />
          </span>
        </a>
      </Group>
      {facets.map((facet) => (
        <Group
          key={facet.code}
          code={facet.code}
          title={facet.unit && !isPrice(facet) ? `${facet.name} (${facet.unit})` : facet.name}
        >
          {facet.kind === 'range' ? (
            <RangeFacet path={path} params={params} facet={facet} />
          ) : (
            <ValueFacet path={path} params={params} facet={facet} />
          )}
        </Group>
      ))}
    </div>
  );
}

/** The filter column on desktop, the "Filters" button and full-screen panel on a phone. */
export function Filters({
  path,
  params,
  facets,
  total,
}: {
  path: string;
  params: SearchParams;
  facets: readonly FacetDto[];
  total: number;
}) {
  const applied = appliedFilters(path, params, facets).length;
  return (
    <div data-filters className="md:w-64 md:shrink-0">
      <details data-filter-toggle className="group peer md:hidden">
        <summary
          className={cx(
            buttonClass('secondary', 'md'),
            'group-open:fixed group-open:top-3 group-open:right-4 group-open:z-50',
          )}
        >
          <FilterIcon className="group-open:hidden" />
          <CloseIcon className="hidden group-open:block" />
          <span className="group-open:hidden">Filters</span>
          <span className="hidden group-open:inline">Close</span>
          {applied > 0 ? <CountBadge count={applied} label="applied" /> : null}
        </summary>
      </details>
      <aside
        id="filters"
        aria-label="Filters"
        tabIndex={-1}
        className="fixed inset-0 z-40 hidden overflow-y-auto bg-surface px-4 pt-16 pb-24 outline-none peer-open:block md:static md:z-auto md:block md:overflow-visible md:bg-transparent md:p-0"
      >
        <h2 className="mb-4 text-lg font-semibold md:sr-only">Filters</h2>
        <FacetGroups path={path} params={params} facets={facets} />
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface p-4 md:hidden">
          <ButtonLink
            href={href(path, params, {}, { keepPage: true })}
            data-close-filters
            className="w-full"
          >
            Show {productCount(total)}
          </ButtonLink>
        </div>
      </aside>
      <FilterPanelEnhancer />
    </div>
  );
}
