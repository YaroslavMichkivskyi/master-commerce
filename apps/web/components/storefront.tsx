import type { FacetDto, ProductCardDto, ProductListPageDto } from '@master-commerce/dto';
import { euros, flatten, href, pageHref, rangeOf, type SearchParams, toggle } from '../lib/query';
import { jsonLd } from '../lib/seo';

// Building blocks of the storefront pages (TASK-6 FR-031…FR-033). Server components; a
// filter is a link (or a GET form for a range), so every state has an address.

export interface Crumb {
  name: string;
  href?: string;
}

export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {trail.map((c, i) => (
          <li key={`${c.name}-${i}`}>
            {c.href ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="stock in">In stock</span>
  ) : (
    <span className="stock out">Out of stock</span>
  );
}

export function ProductCard({ card }: { card: ProductCardDto }) {
  return (
    <article className="card" data-slug={card.slug}>
      <a href={`/p/${card.slug}`} className="card-name">
        {card.name}
      </a>
      <div className="card-brand">
        <a href={`/brands/${card.brand.slug}`}>{card.brand.name}</a>
      </div>
      <ul className="card-highlights">
        {card.highlights.map((h) => (
          <li key={h.name}>
            {h.name}: {h.value}
          </li>
        ))}
      </ul>
      <div className="card-foot">
        <span className="price">{euros(card.priceCents)}</span>
        <StockBadge inStock={card.inStock} />
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: readonly ProductCardDto[] }) {
  return (
    <div className="grid">
      {items.map((card) => (
        <ProductCard key={card.id} card={card} />
      ))}
    </div>
  );
}

/** Hidden inputs that keep the rest of the query in a range form. */
function KeepQuery({ params, except }: { params: SearchParams; except: readonly string[] }) {
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
  const price = facet.code === 'price';
  const selected = rangeOf(flatten(params)[facet.code]);
  // Price facets come in cents; the address and the form are in euros.
  const show = (n: number | undefined) =>
    n === undefined ? undefined : price ? String(Math.floor(n / 100)) : String(n);
  const low = show(facet.min);
  const high =
    price && facet.max !== undefined ? String(Math.ceil(facet.max / 100)) : show(facet.max);
  return (
    <form method="get" action={path} className="range">
      <KeepQuery params={params} except={[facet.code]} />
      <label>
        from
        <input
          type="number"
          name={`${facet.code}.min`}
          defaultValue={selected.min}
          placeholder={low}
          step="any"
        />
      </label>
      <label>
        to
        <input
          type="number"
          name={`${facet.code}.max`}
          defaultValue={selected.max}
          placeholder={high}
          step="any"
        />
      </label>
      <span className="unit">{price ? '€' : (facet.unit ?? '')}</span>
      <button type="submit">Apply</button>
      {selected.min || selected.max ? (
        <a href={href(path, params, { [facet.code]: undefined })}>Clear</a>
      ) : null}
    </form>
  );
}

export function Facets({
  path,
  params,
  facets,
}: {
  path: string;
  params: SearchParams;
  facets: readonly FacetDto[];
}) {
  const flat = flatten(params);
  return (
    <aside className="facets" aria-label="Filters">
      <section className="facet">
        <h3>Availability</h3>
        <a
          href={href(path, params, { stock: flat.stock === 'in' ? undefined : 'in' })}
          className={flat.stock === 'in' ? 'on' : ''}
        >
          <span className="box" aria-hidden="true">
            {flat.stock === 'in' ? '☑' : '☐'}
          </span>{' '}
          In stock only
        </a>
      </section>
      {facets.map((facet) => (
        <section key={facet.code} className="facet" data-facet={facet.code}>
          <h3>
            {facet.name}
            {facet.unit && facet.code !== 'price' ? <small> ({facet.unit})</small> : null}
          </h3>
          {facet.kind === 'range' ? (
            <RangeFacet path={path} params={params} facet={facet} />
          ) : (
            <ul>
              {(facet.values ?? []).map((v) => (
                <li key={v.value}>
                  <a
                    href={href(path, params, { [facet.code]: toggle(flat[facet.code], v.value) })}
                    className={v.selected ? 'on' : v.count === 0 ? 'empty' : ''}
                    rel="nofollow"
                  >
                    <span className="box" aria-hidden="true">
                      {v.selected ? '☑' : '☐'}
                    </span>{' '}
                    {v.label} <span className="count">({v.count})</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </aside>
  );
}

const SORT_LABELS: Record<string, string> = {
  relevance: 'Relevance',
  new: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name',
};

export function SortLinks({
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
  const fallback = search ? 'relevance' : 'new';
  return (
    <nav className="sort" aria-label="Sort">
      Sort:{' '}
      {options.map((o) =>
        o === sort ? (
          <strong key={o}>{SORT_LABELS[o]}</strong>
        ) : (
          <a
            key={o}
            href={href(path, params, { sort: o === fallback ? undefined : o })}
            rel="nofollow"
          >
            {SORT_LABELS[o]}
          </a>
        ),
      )}
    </nav>
  );
}

/** Numbered pages around the current one, with the first and the last. */
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
  const shown = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pageCount])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  return (
    <nav className="pages" aria-label="Pages">
      {page > 1 ? (
        <a href={pageHref(path, params, page - 1)} rel="prev">
          ← Previous
        </a>
      ) : null}
      {shown.map((p, i) => (
        <span key={p}>
          {i > 0 && p - shown[i - 1]! > 1 ? <span className="gap">…</span> : null}
          {p === page ? (
            <strong aria-current="page">{p}</strong>
          ) : (
            <a href={pageHref(path, params, p)}>{p}</a>
          )}
        </span>
      ))}
      {page < pageCount ? (
        <a href={pageHref(path, params, page + 1)} rel="next">
          Next →
        </a>
      ) : null}
    </nav>
  );
}

/** A list page body: facets, sort, the products, pages; a hint at the paging limit. */
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
  return (
    <div className="list">
      <Facets path={path} params={params} facets={list.facets} />
      <section className="results">
        <div className="results-head">
          <span className="total">
            {list.total} {list.total === 1 ? 'product' : 'products'}
          </span>
          <SortLinks path={path} params={params} sort={list.sort} search={search} />
        </div>
        {list.items.length === 0 ? (
          <p className="empty-state">No products match these filters.</p>
        ) : (
          <ProductGrid items={list.items} />
        )}
        <Pagination path={path} params={params} page={list.page} pageCount={list.pageCount} />
        {list.total > list.pageSize * list.pageCount ? (
          <p className="hint">
            Showing the first {list.pageSize * list.pageCount} products — narrow the filters to see
            the others.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** Structured data for search engines, escaped by `jsonLd` (FR-041). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

export function Unavailable() {
  return <p role="alert">The catalog is unavailable right now. Please try again later.</p>;
}
