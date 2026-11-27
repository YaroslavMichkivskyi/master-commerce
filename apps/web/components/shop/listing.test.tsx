import type { FacetDto } from '@master-commerce/dto';
import { describe, expect, it } from 'vitest';
import { card, listPage, render } from '../../test/gateway-stub';
import { Filters } from './filters';
import { Breadcrumbs, Pagination, ResultCount, SortControl } from './list-controls';
import { ListView } from './list-view';
import { ProductCard } from './product-card';
import { ListSkeleton, NoResults, NotFoundState, NothingFound, Unavailable } from './states';

// The listing parts rendered on the server (FR-003, FR-012, FR-013, FR-021, edge cases).
// The phone panel's modal behaviour is checked in the browser (phase 7).

const P = '/c/graphics-cards';
const amp = (s: string) => s.replace(/&/g, '&amp;');

describe('product card', () => {
  const long = 'ASUS ROG Astral GeForce RTX 6090 32GB GDDR7 OC Edition White '.repeat(3).trim();
  const html = render(<ProductCard card={card({ name: long })} />);

  it('links the product, keeps the full name in title, and the brand', () => {
    expect(html).toContain(`href="/p/${card().slug}" title="${long}"`);
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('href="/brands/asus"');
    expect(html).toMatch(/<dt[^>]*>Memory size:<\/dt><dd[^>]*>12 GB<\/dd>/);
  });

  it('has the image place of the final size and the price', () => {
    expect(html).toMatch(/<div aria-hidden="true" class="[^"]*aspect-4\/3/);
    expect(html).toContain('€649.99');
  });

  it('tells the stock in words, not by colour alone', () => {
    expect(html).toContain('In stock');
    expect(render(<ProductCard card={card({ inStock: false })} />)).toContain('Out of stock');
  });
});

describe('filters', () => {
  const many: FacetDto = {
    code: 'chipset',
    name: 'Chipset',
    kind: 'values',
    values: Array.from({ length: 12 }, (_, i) => ({
      value: `c${i}`,
      label: `Chip ${i}`,
      count: i,
      selected: false,
    })),
  };
  const params = { brand: 'asus', sort: 'name', page: '2' };
  const html = render(
    <Filters path={P} params={params} facets={[...listPage().facets, many]} total={50} />,
  );

  it('a value is a link that keeps the query, resets the page and says it is selected', () => {
    expect(html).toContain(`href="${amp(`${P}?sort=name`)}" rel="nofollow"`);
    expect(html).toContain(`href="${amp(`${P}?brand=asus%2Cmsi&sort=name`)}"`);
    expect(html).toMatch(/ASUS<span class="sr-only"> \(selected\)<\/span>/);
  });

  it('shows the first 8 values, the rest behind "Show all (N)"', () => {
    const chipset = html.slice(html.indexOf('data-facet="chipset"'));
    const [visible, hidden] = chipset.split('Show all (12)');
    expect(visible!.match(/<li>/g)).toHaveLength(8);
    expect(hidden!.match(/<li>/g)).toHaveLength(4);
    expect(chipset).toMatch(/<details class="group mt-1 flex flex-col">/);
    // Open, the same summary reads "Show less" (and moves under the list).
    expect(chipset).toMatch(
      /<summary[^>]*group-open:order-last[^>]*>.*Show less<\/span><\/summary>/,
    );
  });

  it('opens "Show all" when a selected value is hidden in it', () => {
    const selected = {
      ...many,
      values: many.values!.map((v, i) => ({ ...v, selected: i === 10 })),
    };
    expect(render(<Filters path={P} params={{}} facets={[selected]} total={1} />)).toMatch(
      /<details class="group mt-1 flex flex-col" open="">/,
    );
  });

  it('a range is a GET form with "Apply" that keeps the other filters but not the page', () => {
    const form = /<form[^>]*>(?:(?!<\/form>)[^])*name="price\.min"[^]*?<\/form>/.exec(html)![0];
    expect(form).toMatch(/^<form[^>]*action="\/c\/graphics-cards" method="get"/);
    expect(form).toContain('<input type="hidden" name="brand" value="asus"/>');
    expect(form).toContain('<input type="hidden" name="sort" value="name"/>');
    expect(form).not.toContain('name="page"');
    expect(form).toContain('name="price.min"');
    expect(form).toContain('placeholder="199"');
    expect(form).toContain('placeholder="2000"');
    expect(form).toContain('>Apply</button>');
  });

  it('on a phone one "Filters" button opens the panel and shows the applied count', () => {
    expect(html).toMatch(/<details data-filter-toggle="true" class="group peer md:hidden">/);
    expect(html).toMatch(/Filters<\/span>.*>1<span class="sr-only"> applied<\/span>/);
    expect(html).toContain('<aside id="filters" aria-label="Filters"');
    expect(html).toContain('Show 50 products');
  });

  it('no count on the button without filters', () => {
    const bare = render(<Filters path={P} params={{}} facets={[]} total={3} />);
    expect(bare).not.toContain('applied</span>');
  });
});

describe('list controls', () => {
  it('pagination keeps the query, page 1 without a page parameter', () => {
    const html = render(
      <Pagination path={P} params={{ brand: 'asus', page: '2' }} page={2} pageCount={3} />,
    );
    expect(html).toContain(`href="${amp(`${P}?brand=asus`)}" rel="prev"`);
    expect(html).toContain(`href="${amp(`${P}?brand=asus&page=3`)}" rel="next"`);
    expect(html).toMatch(/<span aria-current="page"[^>]*>2<\/span>/);
  });

  it('no pagination for one page; disabled steps at the ends', () => {
    expect(render(<Pagination path={P} params={{}} page={1} pageCount={1} />)).toBe('');
    const first = render(<Pagination path={P} params={{}} page={1} pageCount={100} />);
    expect(first).toMatch(/<span aria-disabled="true"[^>]*>.*Previous/);
    expect(first).toContain('…');
    expect(first).toContain(`href="${P}?page=100"`);
  });

  it('sort is a GET form that keeps the filters and drops the page', () => {
    const html = render(
      <SortControl
        path={P}
        params={{ brand: 'asus', page: '4', sort: 'name' }}
        sort="name"
        search={false}
      />,
    );
    expect(html).toContain('<input type="hidden" name="brand" value="asus"/>');
    expect(html).not.toContain('name="page"');
    expect(html).not.toContain('type="hidden" name="sort"');
    expect(html).toMatch(
      /<label for="sort"[^>]*>Sort<\/label><span[^>]*><select[^>]* id="sort" name="sort"/,
    );
    expect(html).toContain('<option value="name" selected="">Name</option>');
    expect(html).not.toContain('Relevance');
  });

  it('the result count is a polite live region', () => {
    expect(render(<ResultCount total={1234} />)).toMatch(
      /^<div role="status" aria-live="polite" aria-atomic="true"[^>]*><h2[^>]*>1,234 products<\/h2>/,
    );
  });

  it('says which products the page shows, and the page past the first', () => {
    const count = (page: number, shown: number) =>
      render(<ResultCount total={35511} page={page} pageSize={24} pageCount={100} shown={shown} />);
    expect(count(1, 24)).toContain('1–24 shown</p>');
    expect(count(2, 24)).toContain('25–48 shown, page 2 of 100');
    expect(count(100, 24)).toContain('2,377–2,400 shown, page 100 of 100');
    // One page: the count says it all.
    expect(render(<ResultCount total={3} pageSize={24} pageCount={1} shown={3} />)).not.toContain(
      'shown',
    );
  });

  it('breadcrumbs mark the current page', () => {
    const html = render(<Breadcrumbs trail={[{ name: 'Home', href: '/' }, { name: 'CPUs' }]} />);
    expect(html).toContain('<nav aria-label="Breadcrumb">');
    expect(html).toMatch(/<span aria-current="page"[^>]*>CPUs<\/span>/);
  });
});

describe('list view', () => {
  it('chips above the list remove a filter; "Clear all" from two on', () => {
    const html = render(
      <ListView path={P} params={{ brand: 'asus', stock: 'in' }} list={listPage()} />,
    );
    expect(html).toContain('<ul aria-label="Applied filters"');
    expect(html).toMatch(/Brand: ASUS<svg[^]*?<span class="sr-only">, remove<\/span>/);
    expect(html).toContain(`href="${P}?stock=in"`);
    expect(html).toContain(`>Clear all</a>`);
    expect(html).toContain('50 products');
  });

  it('an emptied list says so and offers to clear the filters', () => {
    const html = render(
      <ListView
        path={P}
        params={{ brand: 'asus' }}
        list={listPage({ items: [], total: 0, pageCount: 0 })}
      />,
    );
    expect(html).toContain('No products match these filters');
    expect(html).toContain(`href="${P}">Clear all filters</a>`);
  });

  it('hints at the paging limit', () => {
    const html = render(
      <ListView path={P} params={{}} list={listPage({ total: 5000, pageCount: 100 })} />,
    );
    expect(html).toContain('Showing the first 2400 products');
  });
});

describe('states', () => {
  it('empty without filters points to the categories', () => {
    expect(render(<NoResults clearHref={P} filtered={false} />)).toContain('href="/"');
  });

  it('unavailable is an alert with the retry it is given', () => {
    const html = render(<Unavailable retry={<button type="button">Try again</button>} />);
    expect(html).toMatch(/^<section role="alert"/);
    expect(html).toContain('<h1');
    expect(html).toContain('>Try again</button>');
  });

  it('not found has one heading and a way on', () => {
    const html = render(<NotFoundState />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Page not found');
    expect(html).toContain('href="/"');
  });

  it('nothing found is the page heading with the suggestions; "Search" before any words', () => {
    const html = render(
      <NothingFound query="zzz" suggestions={<a href="/c/storage">Storage</a>} />,
    );
    expect(html).toMatch(/<h1[^>]*>Nothing found for “zzz”<\/h1>/);
    expect(html).toContain('href="/c/storage"');
    expect(render(<NothingFound query="" />)).toMatch(/<h1[^>]*>Search<\/h1>/);
  });

  it('loading keeps the card sizes and is announced as busy', () => {
    const html = render(<ListSkeleton cards={4} />);
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/aspect-4\/3/g)).toHaveLength(4);
    expect(html).toContain('Loading products');
  });
});
