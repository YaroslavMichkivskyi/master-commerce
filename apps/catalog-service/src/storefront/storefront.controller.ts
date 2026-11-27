import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  type PipeTransform,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ProductCardListDto,
  ProductListPageDto,
  SitemapDto,
  SitemapPartDto,
  SLUG_PATTERN,
  STOREFRONT_SORTS,
  StorefrontProductDto,
  StorefrontTreeDto,
} from '@master-commerce/dto';
import { ApiProblemResponses, Public } from '@master-commerce/service-core';
import { StorefrontService } from './storefront.service.js';

/** A slug in the path; anything else is no page of the shop: `404`. */
class SlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (value.length > 100 || !SLUG_PATTERN.test(value))
      throw new NotFoundException('No such page');
    return value;
  }
}
const Slug = () => Param('slug', new SlugPipe());

const LIST_DOC =
  'Also one parameter per filterable attribute of the category, by its code: values ' +
  'comma-separated (select, multi-select, boolean `true` / `false`), or `min-max` for numbers. ' +
  'Unknown parameters are ignored; malformed values answer 400.';

/** The list parameters every product list takes (contracts/http.md). */
function ApiListQuery(): MethodDecorator {
  return (target, key, descriptor) => {
    const decorators = [
      ApiQuery({ name: 'brand', required: false, description: 'Brand slugs, comma-separated' }),
      ApiQuery({
        name: 'price',
        required: false,
        description: 'Euros, min-max (200-500, 200-, -500)',
      }),
      ApiQuery({ name: 'stock', required: false, enum: ['in'], description: 'In stock only' }),
      ApiQuery({ name: 'sort', required: false, enum: STOREFRONT_SORTS }),
      ApiQuery({
        name: 'page',
        required: false,
        description: 'From 1; past 100 or the last page, the last page that may be shown',
      }),
    ];
    for (const d of decorators) d(target, key, descriptor);
  };
}

// Public and read-only (TASK-6 FR-001); the gateway serves it as /api/v1/catalog/...
@ApiTags('storefront')
@Controller('storefront')
@Public()
@ApiProblemResponses(400)
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get('categories')
  @ApiOperation({ summary: 'The category tree with the published products of each subtree' })
  @ApiOkResponse({ type: StorefrontTreeDto })
  tree(): Promise<StorefrontTreeDto> {
    return this.storefront.tree();
  }

  @Get('categories/:slug/products')
  @ApiOperation({
    summary: 'Products of a category and its subcategories, filtered, sorted, paged',
    description: LIST_DOC,
  })
  @ApiListQuery()
  @ApiOkResponse({ type: ProductListPageDto, description: 'The category has its current slug' })
  @ApiProblemResponses(404)
  category(
    @Slug() slug: string,
    @Query() query: Record<string, unknown>,
  ): Promise<ProductListPageDto> {
    return this.storefront.categoryList(slug, query);
  }

  @Get('brands/:slug/products')
  @ApiOperation({ summary: "A brand's products with a category facet" })
  @ApiListQuery()
  @ApiQuery({ name: 'category', required: false, description: 'A category slug (its subtree)' })
  @ApiOkResponse({ type: ProductListPageDto, description: 'The brand has its current slug' })
  @ApiProblemResponses(404)
  brand(
    @Slug() slug: string,
    @Query() query: Record<string, unknown>,
  ): Promise<ProductListPageDto> {
    return this.storefront.brandList(slug, query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by words; the last word may be partial' })
  @ApiQuery({ name: 'q', required: true, description: 'At most 200 characters, 10 words' })
  @ApiListQuery()
  @ApiQuery({ name: 'category', required: false, description: 'A category slug (its subtree)' })
  @ApiOkResponse({ type: ProductListPageDto })
  search(@Query() query: Record<string, unknown>): Promise<ProductListPageDto> {
    return this.storefront.search(query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'A published product by its current or a former slug' })
  @ApiOkResponse({ type: StorefrontProductDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  product(@Slug() slug: string): Promise<StorefrontProductDto> {
    return this.storefront.product(slug);
  }

  @Get('new')
  @ApiOperation({ summary: 'The newest published products' })
  @ApiQuery({ name: 'limit', required: false, description: '1…48, default 12' })
  @ApiOkResponse({ type: ProductCardListDto })
  newest(
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ): Promise<ProductCardListDto> {
    return this.storefront.newest(Math.min(48, Math.max(1, limit)));
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'What the sitemap lists; products in parts of 50 000' })
  @ApiOkResponse({ type: SitemapDto })
  sitemap(): Promise<SitemapDto> {
    return this.storefront.sitemap();
  }

  @Get('sitemap/products/:part')
  @ApiOperation({ summary: 'One part of the products in the sitemap' })
  @ApiOkResponse({ type: SitemapPartDto })
  sitemapPart(@Param('part', ParseIntPipe) part: number): Promise<SitemapPartDto> {
    if (part < 0 || part > 1000) throw new NotFoundException('No such part');
    return this.storefront.sitemapPart(part);
  }
}
