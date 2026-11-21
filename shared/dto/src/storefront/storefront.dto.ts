import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// The public, read-only storefront API (TASK-6 contracts/http.md). Answers only: the
// query of a list is free-form (attribute codes) and is parsed by the catalog itself.

export const STOREFRONT_PAGE_SIZE = 24;
export const STOREFRONT_PAGE_MAX = 100;
export const STOREFRONT_SORTS = ['new', 'price-asc', 'price-desc', 'name', 'relevance'] as const;
export type StorefrontSort = (typeof STOREFRONT_SORTS)[number];

/** A link in a breadcrumb trail or to a related page. */
export class CrumbDto {
  @ApiProperty({ example: 'Components' })
  name!: string;

  @ApiProperty({ example: 'components' })
  slug!: string;
}

export class BrandRefDto extends CrumbDto {}

/** A node of the storefront category tree: live categories, published products. */
export class StorefrontCategoryNodeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Graphics cards' })
  name!: string;

  @ApiProperty({ example: 'graphics-cards' })
  slug!: string;

  @ApiProperty({ example: 1234, description: 'Published products in this category and below' })
  productCount!: number;

  @ApiProperty({ type: () => [StorefrontCategoryNodeDto] })
  children!: StorefrontCategoryNodeDto[];
}

export class StorefrontTreeDto {
  @ApiProperty({ type: () => [StorefrontCategoryNodeDto], description: 'Top-level categories' })
  items!: StorefrontCategoryNodeDto[];
}

export class SubcategoryDto extends CrumbDto {
  @ApiProperty({ example: 310 })
  productCount!: number;
}

/** The category a list belongs to, with its path for breadcrumbs. */
export class StorefrontCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Graphics cards' })
  name!: string;

  @ApiProperty({ example: 'graphics-cards', description: 'The current slug' })
  slug!: string;

  @ApiProperty({ type: () => [CrumbDto], description: 'Ancestors, root first' })
  path!: CrumbDto[];

  @ApiProperty({ type: () => [SubcategoryDto] })
  children!: SubcategoryDto[];
}

export class StorefrontBrandDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ASUS' })
  name!: string;

  @ApiProperty({ example: 'asus', description: 'The current slug' })
  slug!: string;
}

/** A spec shown on a product card: name and value with its unit, ready to print. */
export class HighlightDto {
  @ApiProperty({ example: 'Memory size' })
  name!: string;

  @ApiProperty({ example: '12 GB' })
  value!: string;
}

/** What a product card shows (FR-007). */
export class ProductCardDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ASUS TUF Gaming GeForce RTX 6070 12GB' })
  name!: string;

  @ApiProperty({ example: 'asus-tuf-gaming-geforce-rtx-6070-12gb-1x2' })
  slug!: string;

  @ApiProperty({ type: () => BrandRefDto })
  brand!: BrandRefDto;

  @ApiProperty({ example: 64999, description: 'EUR cents, VAT included' })
  priceCents!: number;

  @ApiProperty({ example: true })
  inStock!: boolean;

  @ApiProperty({ type: () => [HighlightDto], description: "The leaf category's first attributes" })
  highlights!: HighlightDto[];
}

export class FacetValueDto {
  @ApiProperty({ example: 'asus', description: 'What goes into the query to select it' })
  value!: string;

  @ApiProperty({ example: 'ASUS' })
  label!: string;

  @ApiProperty({
    example: 310,
    description: 'Products with all other filters applied and this value',
  })
  count!: number;

  @ApiProperty({ example: false })
  selected!: boolean;
}

export class FacetRangeDto {
  @ApiPropertyOptional({ example: 8 })
  min?: number;

  @ApiPropertyOptional({ example: 32 })
  max?: number;
}

/** One filter of a list with its counts or its range (FR-003). */
export class FacetDto {
  @ApiProperty({ example: 'memory_type', description: 'The query parameter of this filter' })
  code!: string;

  @ApiProperty({ example: 'Memory type' })
  name!: string;

  @ApiProperty({ enum: ['values', 'range'] })
  kind!: 'values' | 'range';

  @ApiPropertyOptional({ example: 'GB', description: 'For price: EUR, values in cents' })
  unit?: string;

  @ApiPropertyOptional({ type: () => [FacetValueDto] })
  values?: FacetValueDto[];

  @ApiPropertyOptional({
    example: 8,
    description: 'Range: lowest among products matching the other filters',
  })
  min?: number;

  @ApiPropertyOptional({ example: 32 })
  max?: number;

  @ApiPropertyOptional({ type: () => FacetRangeDto, description: 'Range: what is selected' })
  selected?: FacetRangeDto;
}

/** A page of a category, brand or search list (FR-002…FR-007, FR-011). */
export class ProductListPageDto {
  @ApiPropertyOptional({ type: () => StorefrontCategoryDto })
  category?: StorefrontCategoryDto;

  @ApiPropertyOptional({ type: () => StorefrontBrandDto })
  brand?: StorefrontBrandDto;

  @ApiPropertyOptional({ example: 'rtx 6070', description: 'Search: the query as understood' })
  query?: string;

  @ApiProperty({ type: () => [ProductCardDto] })
  items!: ProductCardDto[];

  @ApiProperty({ example: 1234 })
  total!: number;

  @ApiProperty({ example: 1, description: 'The page answered (the last one when asked beyond it)' })
  page!: number;

  @ApiProperty({ example: STOREFRONT_PAGE_SIZE })
  pageSize!: number;

  @ApiProperty({ example: 52, description: `At most ${STOREFRONT_PAGE_MAX}` })
  pageCount!: number;

  @ApiProperty({ enum: STOREFRONT_SORTS })
  sort!: StorefrontSort;

  @ApiProperty({ type: () => [FacetDto] })
  facets!: FacetDto[];
}

export class ProductSpecDto {
  @ApiProperty({ example: 'memory_size' })
  code!: string;

  @ApiProperty({ example: 'Memory size' })
  name!: string;

  @ApiProperty({ enum: ['select', 'multi_select', 'number', 'boolean', 'text'] })
  type!: 'select' | 'multi_select' | 'number' | 'boolean' | 'text';

  @ApiPropertyOptional({ example: 'GB' })
  unit?: string;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: 12,
  })
  value!: string | number | boolean | string[];
}

export class ProductCategoryDto extends CrumbDto {
  @ApiProperty({ type: () => [CrumbDto], description: 'Ancestors, root first' })
  path!: CrumbDto[];
}

/** A product page (FR-008). */
export class StorefrontProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ASUS TUF Gaming GeForce RTX 6070 12GB' })
  name!: string;

  @ApiProperty({
    example: 'asus-tuf-gaming-geforce-rtx-6070-12gb-1x2',
    description: 'The current slug',
  })
  slug!: string;

  @ApiProperty({ example: 'ASU-GRA-1X2' })
  sku!: string;

  @ApiProperty({ example: 'A graphics card for gaming.' })
  description!: string;

  @ApiProperty({ type: () => BrandRefDto })
  brand!: BrandRefDto;

  @ApiProperty({ type: () => ProductCategoryDto })
  category!: ProductCategoryDto;

  @ApiProperty({ example: 64999, description: 'EUR cents, VAT included' })
  priceCents!: number;

  @ApiProperty({ example: true })
  inStock!: boolean;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: () => [ProductSpecDto], description: 'In attribute order, root first' })
  specs!: ProductSpecDto[];
}

export class ProductCardListDto {
  @ApiProperty({ type: () => [ProductCardDto] })
  items!: ProductCardDto[];
}

export class SitemapEntryDto {
  @ApiProperty({ example: 'graphics-cards' })
  slug!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

/** What the sitemap lists, the products in parts (FR-042). */
export class SitemapDto {
  @ApiProperty({ type: () => [SitemapEntryDto] })
  categories!: SitemapEntryDto[];

  @ApiProperty({ type: () => [SitemapEntryDto] })
  brands!: SitemapEntryDto[];

  @ApiProperty({ example: 3, description: 'Parts of at most 50 000 products' })
  productParts!: number;
}

export class SitemapPartDto {
  @ApiProperty({ type: () => [SitemapEntryDto] })
  items!: SitemapEntryDto[];
}
