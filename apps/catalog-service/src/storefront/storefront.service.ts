import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CrumbDto,
  type FacetDto,
  type FacetValueDto,
  type HighlightDto,
  type ProductCardDto,
  type ProductCardListDto,
  type ProductListPageDto,
  type ProductSpecDto,
  type SitemapDto,
  type SitemapPartDto,
  STOREFRONT_PAGE_MAX,
  STOREFRONT_PAGE_SIZE,
  type StorefrontCategoryNodeDto,
  type StorefrontProductDto,
  type StorefrontTreeDto,
} from '@master-commerce/dto';
import { and, asc, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { entityOfFormerSlug } from '../admin/common/slugs.js';
import { DB, type Database } from '../db/database.js';
import { brand, category, product, type SlugKind } from '../db/schema.js';
import {
  ancestorsOf,
  type CatalogSnapshot,
  effectiveAttributes,
  loadSnapshot,
  type SnapshotCategory,
  subtreeOf,
} from './catalog-snapshot.js';
import { type ListFilters, parseFilters, RESERVED, type StorefrontAttribute } from './filters.js';
import {
  type FacetRow,
  type ListItemRow,
  type ListRow,
  type ListScope,
  listStatement,
} from './list-query.js';
import { searchQuery } from './search-query.js';

// The public storefront (TASK-6 FR-001…FR-011): only published products of live brands
// and categories, never an audit column or a version.

type RawQuery = Readonly<Record<string, unknown>>;

const SITEMAP_PART = 50_000;
const HIGHLIGHTS = 3;

/** What is for sale: live, published, its brand and category live. */
const onSale = and(
  isNull(product.deletedAt),
  eq(product.published, true),
  isNull(brand.deletedAt),
  isNull(category.deletedAt),
);

/** A spec value as printed: "12 GB", "Yes", "HDMI 2.1, USB-C". */
export function formatValue(attribute: StorefrontAttribute, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ');
  const text =
    typeof value === 'number' || typeof value === 'string' ? String(value) : JSON.stringify(value);
  return attribute.unit ? `${text} ${attribute.unit}` : text;
}

const crumb = (c: SnapshotCategory): CrumbDto => ({ name: c.name, slug: c.slug });

/** A tree node whose count is the category's own products plus its subtree's. */
function nodeOf(
  snapshot: CatalogSnapshot,
  c: SnapshotCategory,
  own: ReadonlyMap<string, number>,
): StorefrontCategoryNodeDto {
  const children = (snapshot.children.get(c.id) ?? []).map((x) => nodeOf(snapshot, x, own));
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: (own.get(c.id) ?? 0) + children.reduce((sum, x) => sum + x.productCount, 0),
    children,
  };
}

@Injectable()
export class StorefrontService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Live categories with the published products of each subtree (FR-001). */
  async tree(): Promise<StorefrontTreeDto> {
    const snapshot = await loadSnapshot(this.db);
    const own = await this.ownCounts();
    return { items: (snapshot.children.get(null) ?? []).map((c) => nodeOf(snapshot, c, own)) };
  }

  /** Published products per category, of the given categories or of all. */
  private async ownCounts(ids?: readonly string[]): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ categoryId: product.categoryId, n: count() })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(and(onSale, ids ? inArray(product.categoryId, [...ids]) : undefined))
      .groupBy(product.categoryId);
    return new Map(rows.map((r) => [r.categoryId, r.n]));
  }

  /** A category and everything below it, filtered by its effective attributes (FR-006). */
  async categoryList(slug: string, query: RawQuery): Promise<ProductListPageDto> {
    const snapshot = await loadSnapshot(this.db);
    const current = await this.resolve(snapshot, 'category', slug);
    // A code taken by a list parameter (an attribute made before the admin refused such
    // codes) gets no filter and no facet, or it would merge with the built-in one.
    const attributes = effectiveAttributes(snapshot, current.id).filter(
      (a) => a.type !== 'text' && !RESERVED.has(a.code),
    );
    const filters = parseFilters(query, attributes, { search: false, categoryFilter: false });
    const page = await this.list(snapshot, {
      scope: { kind: 'category', categoryIds: subtreeOf(snapshot, current.id) },
      filters,
      facetAttributes: attributes,
      categoryFacet: false,
    });
    const own = await this.ownCounts(subtreeOf(snapshot, current.id));
    return {
      ...page,
      category: {
        id: current.id,
        name: current.name,
        slug: current.slug,
        path: ancestorsOf(snapshot, current.id).map(crumb),
        children: (snapshot.children.get(current.id) ?? []).map((c) => ({
          ...crumb(c),
          productCount: nodeOf(snapshot, c, own).productCount,
        })),
      },
    };
  }

  /** A brand's products, with a facet of their categories. */
  async brandList(slug: string, query: RawQuery): Promise<ProductListPageDto> {
    const snapshot = await loadSnapshot(this.db);
    const [row] = await this.db
      .select()
      .from(brand)
      .where(and(eq(brand.slug, slug), isNull(brand.deletedAt)));
    const found = row ?? (await this.formerBrand(slug));
    if (!found) throw new NotFoundException(`No brand has the slug "${slug}"`);
    // The page is the brand: a `brand` parameter is ignored (contracts/http.md), even a
    // malformed one, so it is taken out before the query is read.
    const rest = Object.fromEntries(Object.entries(query).filter(([name]) => name !== 'brand'));
    const filters = parseFilters(rest, [], { search: false, categoryFilter: true });
    const page = await this.list(snapshot, {
      scope: { kind: 'brand', brandId: found.id },
      filters,
      categoryIds: this.categoryFilter(snapshot, filters),
      facetAttributes: [],
      categoryFacet: true,
    });
    return {
      ...page,
      facets: page.facets.filter((f) => f.code !== 'brand'),
      brand: { id: found.id, name: found.name, slug: found.slug },
    };
  }

  /** Search by words, with brand and category facets (FR-010, FR-011). */
  async search(query: RawQuery): Promise<ProductListPageDto> {
    const { words, tsquery } = searchQuery(query.q);
    const snapshot = await loadSnapshot(this.db);
    const filters = parseFilters(query, [], { search: true, categoryFilter: true });
    const page = await this.list(snapshot, {
      scope: { kind: 'search', tsquery },
      filters,
      categoryIds: this.categoryFilter(snapshot, filters),
      facetAttributes: [],
      categoryFacet: true,
    });
    return { ...page, query: words.join(' ') };
  }

  /** A product by its current or a former slug (FR-008); the body has the current one. */
  async product(slug: string): Promise<StorefrontProductDto> {
    const snapshot = await loadSnapshot(this.db);
    const select = (where: SQL | undefined) =>
      this.db
        .select({ product, brandName: brand.name, brandSlug: brand.slug })
        .from(product)
        .innerJoin(brand, eq(brand.id, product.brandId))
        .innerJoin(category, eq(category.id, product.categoryId))
        .where(and(onSale, where));
    let [row] = await select(eq(product.slug, slug));
    if (!row) {
      const id = await entityOfFormerSlug(this.db, 'product', slug);
      if (id) [row] = await select(eq(product.id, id));
    }
    const leaf = row ? snapshot.byId.get(row.product.categoryId) : undefined;
    if (!row || !leaf) throw new NotFoundException(`No product has the slug "${slug}"`);
    const p = row.product;
    const specs: ProductSpecDto[] = effectiveAttributes(snapshot, leaf.id).flatMap((a) => {
      const value = p.specs[a.code];
      if (value === undefined) return [];
      return [
        {
          code: a.code,
          name: a.name,
          type: a.type,
          ...(a.unit ? { unit: a.unit } : {}),
          value: value as ProductSpecDto['value'],
        },
      ];
    });
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      brand: { name: row.brandName, slug: row.brandSlug },
      category: { ...crumb(leaf), path: ancestorsOf(snapshot, leaf.id).map(crumb) },
      priceCents: p.priceCents,
      inStock: p.stock > 0,
      updatedAt: p.updatedAt.toISOString(),
      specs,
    };
  }

  /** The newest published products, for the home page. */
  async newest(limit: number): Promise<ProductCardListDto> {
    const snapshot = await loadSnapshot(this.db);
    const rows = await this.db
      .select({ product, brandName: brand.name, brandSlug: brand.slug })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(onSale)
      .orderBy(desc(product.createdAt), desc(product.id))
      .limit(limit);
    return {
      items: rows.map((r) =>
        this.card(snapshot, {
          id: r.product.id,
          name: r.product.name,
          slug: r.product.slug,
          priceCents: r.product.priceCents,
          inStock: r.product.stock > 0,
          brandSlug: r.brandSlug,
          brandName: r.brandName,
          categoryId: r.product.categoryId,
          specs: r.product.specs,
        }),
      ),
    };
  }

  /** What the sitemap lists; products in parts of 50 000 (FR-042). */
  async sitemap(): Promise<SitemapDto> {
    const snapshot = await loadSnapshot(this.db);
    const brands = await this.db
      .select({ slug: brand.slug, updatedAt: brand.updatedAt })
      .from(brand)
      .where(isNull(brand.deletedAt))
      .orderBy(asc(brand.slug));
    const [total] = await this.db
      .select({ n: count() })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(onSale);
    return {
      categories: [...snapshot.byId.values()].map((c) => ({
        slug: c.slug,
        updatedAt: c.updatedAt.toISOString(),
      })),
      brands: brands.map((b) => ({ slug: b.slug, updatedAt: b.updatedAt.toISOString() })),
      // No products for sale: no product file, rather than one that answers 404.
      productParts: Math.ceil((total?.n ?? 0) / SITEMAP_PART),
    };
  }

  async sitemapPart(part: number): Promise<SitemapPartDto> {
    const rows = await this.db
      .select({ slug: product.slug, updatedAt: product.updatedAt })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .where(onSale)
      .orderBy(asc(product.id))
      .limit(SITEMAP_PART)
      .offset(part * SITEMAP_PART);
    return { items: rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() })) };
  }

  /** A live category or brand by its current slug, or by a former one. */
  private async resolve(
    snapshot: CatalogSnapshot,
    kind: SlugKind,
    slug: string,
  ): Promise<SnapshotCategory> {
    const current = snapshot.bySlug.get(slug);
    if (current) return current;
    const id = await entityOfFormerSlug(this.db, kind, slug);
    const former = id ? snapshot.byId.get(id) : undefined;
    if (!former) throw new NotFoundException(`No category has the slug "${slug}"`);
    return former;
  }

  private async formerBrand(slug: string) {
    const id = await entityOfFormerSlug(this.db, 'brand', slug);
    if (!id) return undefined;
    const [row] = await this.db
      .select()
      .from(brand)
      .where(and(eq(brand.id, id), isNull(brand.deletedAt)));
    return row;
  }

  /** The subtree of the `category` filter; an unknown slug filters nothing (spec edge cases). */
  private categoryFilter(snapshot: CatalogSnapshot, filters: ListFilters): string[] | undefined {
    const chosen = filters.category ? snapshot.bySlug.get(filters.category) : undefined;
    return chosen ? subtreeOf(snapshot, chosen.id) : undefined;
  }

  private async list(
    snapshot: CatalogSnapshot,
    query: {
      scope: ListScope;
      filters: ListFilters;
      categoryIds?: string[];
      facetAttributes: StorefrontAttribute[];
      categoryFacet: boolean;
    },
  ): Promise<ProductListPageDto> {
    const result = await this.db.execute(listStatement(query));
    const row = result.rows[0] as unknown as ListRow;
    const total = Number(row.total);
    return {
      items: row.items.map((item) => this.card(snapshot, item)),
      total,
      page: Math.floor(Number(row.offset) / STOREFRONT_PAGE_SIZE) + 1,
      pageSize: STOREFRONT_PAGE_SIZE,
      pageCount: Math.max(
        1,
        Math.min(STOREFRONT_PAGE_MAX, Math.ceil(total / STOREFRONT_PAGE_SIZE)),
      ),
      sort: query.filters.sort,
      facets: facetsOf(row.facets, query.filters, query.facetAttributes, snapshot),
    };
  }

  /** A card: the leaf's own attributes first, then the inherited ones (FR-007). */
  private card(snapshot: CatalogSnapshot, item: ListItemRow): ProductCardDto {
    const leaf = snapshot.byId.get(item.categoryId);
    const ordered = leaf
      ? [
          ...leaf.attributes,
          ...ancestorsOf(snapshot, leaf.id)
            .reverse()
            .flatMap((c) => c.attributes),
        ]
      : [];
    const highlights: HighlightDto[] = [];
    for (const a of ordered) {
      if (highlights.length === HIGHLIGHTS) break;
      const value = item.specs[a.code];
      if (value !== undefined) highlights.push({ name: a.name, value: formatValue(a, value) });
    }
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      brand: { name: item.brandName, slug: item.brandSlug },
      priceCents: item.priceCents,
      inStock: item.inStock,
      highlights,
    };
  }
}

const numberOrUndefined = (v: string | number | null): number | undefined =>
  v === null ? undefined : Number(v);

/** Facet rows → facets in a fixed order: brand, price, category, attributes (FR-003). */
export function facetsOf(
  rows: readonly FacetRow[],
  filters: ListFilters,
  attributes: readonly StorefrontAttribute[],
  snapshot: CatalogSnapshot,
): FacetDto[] {
  const byCode = new Map<string, FacetRow[]>();
  for (const r of rows) byCode.set(r.code, [...(byCode.get(r.code) ?? []), r]);
  const facets: FacetDto[] = [];

  const valuesFacet = (
    code: string,
    name: string,
    selected: readonly string[],
    label: (value: string, row?: FacetRow) => string,
    order?: readonly string[] | null,
    countOfSelected?: (value: string, counted: readonly FacetRow[]) => number,
  ) => {
    const counted = (byCode.get(code) ?? []).filter((r) => r.value !== null);
    const values: FacetValueDto[] = counted.map((r) => ({
      value: r.value!,
      label: label(r.value!, r),
      count: r.count ?? 0,
      selected: selected.includes(r.value!),
    }));
    // A selected value no product has keeps its box, with 0 (or what it stands for).
    for (const s of selected) {
      if (!values.some((v) => v.value === s))
        values.push({
          value: s,
          label: label(s),
          count: countOfSelected?.(s, counted) ?? 0,
          selected: true,
        });
    }
    const rank = (v: FacetValueDto) => {
      const i = order?.indexOf(v.value) ?? -1;
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    values.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        b.count - a.count ||
        (a.label < b.label ? -1 : a.label > b.label ? 1 : 0),
    );
    if (values.length > 0) facets.push({ code, name, kind: 'values', values });
  };
  const rangeFacet = (
    code: string,
    name: string,
    unit: string | undefined,
    selected: { min?: number; max?: number },
  ) => {
    const r = byCode.get(code)?.[0];
    const min = r ? numberOrUndefined(r.min) : undefined;
    const max = r ? numberOrUndefined(r.max) : undefined;
    if (min === undefined && selected.min === undefined && selected.max === undefined) return;
    facets.push({
      code,
      name,
      kind: 'range',
      ...(unit ? { unit } : {}),
      ...(min !== undefined ? { min, max } : {}),
      ...(selected.min !== undefined || selected.max !== undefined ? { selected } : {}),
    });
  };

  valuesFacet('brand', 'Brand', filters.brands, (v, r) => r?.label ?? v);
  rangeFacet('price', 'Price', 'EUR cents', filters.price);
  if (byCode.has('category') || filters.category) {
    valuesFacet(
      'category',
      'Category',
      filters.category ? [filters.category] : [],
      (v, r) => r?.label ?? snapshot.bySlug.get(v)?.name ?? v,
      null,
      // Products are counted by their own (leaf) category; a selected inner category
      // stands for the leaves under it.
      (v, counted) => {
        const node = snapshot.bySlug.get(v);
        if (!node) return 0;
        const under = new Set(subtreeOf(snapshot, node.id));
        return counted
          .filter((r) => under.has(snapshot.bySlug.get(r.value!)?.id ?? ''))
          .reduce((sum, r) => sum + (r.count ?? 0), 0);
      },
    );
  }
  for (const a of attributes) {
    const filter = filters.attributes.find((f) => f.attribute.code === a.code);
    if (a.type === 'number') {
      rangeFacet(
        a.code,
        a.name,
        a.unit ?? undefined,
        filter?.kind === 'range' ? { min: filter.min, max: filter.max } : {},
      );
    } else {
      const selected = filter?.kind === 'values' ? filter.values : [];
      const label =
        a.type === 'boolean' ? (v: string) => (v === 'true' ? 'Yes' : 'No') : (v: string) => v;
      valuesFacet(
        a.code,
        a.name,
        selected,
        label,
        a.type === 'boolean' ? ['true', 'false'] : a.allowedValues,
      );
    }
  }
  return facets;
}
