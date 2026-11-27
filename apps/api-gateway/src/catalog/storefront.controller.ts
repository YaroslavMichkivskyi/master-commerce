import {
  Controller,
  Get,
  NotFoundException,
  Param,
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
import type { Response } from 'express';
import { relay, Reply } from './admin/relay.js';
import { CatalogClient } from './catalog.client.js';

/** A slug in the path, checked before it goes into the catalog's path; else `404`. */
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
  'comma-separated, or `min-max` for numbers. The catalog reads them; unknown ones are ignored.';

function ApiListQuery(): MethodDecorator {
  return (target, key, descriptor) => {
    for (const d of [
      ApiQuery({ name: 'brand', required: false, description: 'Brand slugs, comma-separated' }),
      ApiQuery({
        name: 'price',
        required: false,
        description: 'Euros, min-max (200-500, 200-, -500)',
      }),
      ApiQuery({ name: 'stock', required: false, enum: ['in'] }),
      ApiQuery({ name: 'sort', required: false, enum: STOREFRONT_SORTS }),
      ApiQuery({
        name: 'page',
        required: false,
        description: 'From 1; past 100 or the last page, the last page that may be shown',
      }),
    ]) {
      d(target, key, descriptor);
    }
  };
}

const base = '/storefront';

// The public storefront of the catalog (TASK-6 FR-020), forwarded with its answers
// (ADR 0021). The query goes on as it came: the catalog parses and checks it.
@ApiTags('catalog: storefront')
@Controller('api/v1/catalog')
@Public()
@ApiProblemResponses(
  400,
  [502, 'catalog-service answered with an error'],
  [503, 'catalog-service is unreachable or timed out'],
)
export class StorefrontController {
  constructor(private readonly catalog: CatalogClient) {}

  @Get('categories')
  @ApiOperation({ summary: 'The category tree with the published products of each subtree' })
  @ApiOkResponse({ type: StorefrontTreeDto })
  async tree(@Reply() res: Response): Promise<StorefrontTreeDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/categories` }));
  }

  @Get('categories/:slug/products')
  @ApiOperation({
    summary: 'Products of a category and its subcategories, filtered, sorted, paged',
    description: LIST_DOC,
  })
  @ApiListQuery()
  @ApiOkResponse({ type: ProductListPageDto })
  @ApiProblemResponses(404)
  async category(
    @Slug() slug: string,
    @Query() query: Record<string, unknown>,
    @Reply() res: Response,
  ): Promise<ProductListPageDto> {
    return relay(
      res,
      await this.catalog.forward('GET', { path: `${base}/categories/${slug}/products`, query }),
    );
  }

  @Get('brands/:slug/products')
  @ApiOperation({ summary: "A brand's products with a category facet" })
  @ApiListQuery()
  @ApiQuery({ name: 'category', required: false, description: 'A category slug (its subtree)' })
  @ApiOkResponse({ type: ProductListPageDto })
  @ApiProblemResponses(404)
  async brand(
    @Slug() slug: string,
    @Query() query: Record<string, unknown>,
    @Reply() res: Response,
  ): Promise<ProductListPageDto> {
    return relay(
      res,
      await this.catalog.forward('GET', { path: `${base}/brands/${slug}/products`, query }),
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by words; the last word may be partial' })
  @ApiQuery({ name: 'q', required: true })
  @ApiListQuery()
  @ApiQuery({ name: 'category', required: false, description: 'A category slug (its subtree)' })
  @ApiOkResponse({ type: ProductListPageDto })
  async search(
    @Query() query: Record<string, unknown>,
    @Reply() res: Response,
  ): Promise<ProductListPageDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/search`, query }));
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'A published product by its current or a former slug' })
  @ApiOkResponse({ type: StorefrontProductDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  async product(@Slug() slug: string, @Reply() res: Response): Promise<StorefrontProductDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/products/${slug}` }));
  }

  @Get('new')
  @ApiOperation({ summary: 'The newest published products' })
  @ApiQuery({ name: 'limit', required: false, description: '1…48, default 12' })
  @ApiOkResponse({ type: ProductCardListDto })
  async newest(
    @Query() query: Record<string, unknown>,
    @Reply() res: Response,
  ): Promise<ProductCardListDto> {
    const limit = typeof query.limit === 'string' ? { limit: query.limit } : {};
    return relay(res, await this.catalog.forward('GET', { path: `${base}/new`, query: limit }));
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'What the sitemap lists; products in parts of 50 000' })
  @ApiOkResponse({ type: SitemapDto })
  async sitemap(@Reply() res: Response): Promise<SitemapDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/sitemap` }));
  }

  @Get('sitemap/products/:part')
  @ApiOperation({ summary: 'One part of the products in the sitemap' })
  @ApiOkResponse({ type: SitemapPartDto })
  @ApiProblemResponses(404)
  async sitemapPart(@Param('part') part: string, @Reply() res: Response): Promise<SitemapPartDto> {
    if (!/^\d{1,4}$/.test(part)) throw new NotFoundException('No such part');
    return relay(
      res,
      await this.catalog.forward('GET', { path: `${base}/sitemap/products/${part}` }),
    );
  }
}
