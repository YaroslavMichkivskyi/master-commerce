import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateProductDto,
  ProductDto,
  ProductListQueryDto,
  ProductPageDto,
  UpdateProductDto,
} from '@master-commerce/dto';
import { ApiProblemResponses, ApiVersionedWrite } from '@master-commerce/service-core';
import type { Response } from 'express';
import { CatalogClient } from '../catalog.client.js';
import { ADMIN_PREFIX, AdminForward, Id, IfMatch, relay, Reply, segment } from './relay.js';

const base = '/admin/products';
const SPECS_400 = 'Invalid input, or specs that do not fit the category (`errors[]` per field)';

@ApiTags('admin: products')
@Controller(`${ADMIN_PREFIX}/products`)
@AdminForward()
export class AdminProductsController {
  constructor(private readonly catalog: CatalogClient) {}

  @Post()
  @ApiOperation({ summary: 'Create a product, unpublished, in a category without children' })
  @ApiCreatedResponse({ type: ProductDto })
  @ApiProblemResponses(
    [400, SPECS_400],
    [404, 'The brand or the category does not exist'],
    [409, 'The slug or SKU is taken, or the category has subcategories'],
  )
  async create(@Body() body: CreateProductDto, @Reply() res: Response): Promise<ProductDto> {
    return relay(res, await this.catalog.forward('POST', { path: base, body }));
  }

  @Get()
  @ApiOperation({ summary: 'List products by category, brand and publication, a page at a time' })
  @ApiOkResponse({ type: ProductPageDto })
  async list(@Query() query: ProductListQueryDto, @Reply() res: Response): Promise<ProductPageDto> {
    return relay(res, await this.catalog.forward('GET', { path: base, query }));
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a product by its current or a former slug' })
  @ApiOkResponse({ type: ProductDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  async getBySlug(@Param('slug') slug: string, @Reply() res: Response): Promise<ProductDto> {
    return relay(
      res,
      await this.catalog.forward('GET', { path: `${base}/by-slug/${segment(slug)}` }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a product' })
  @ApiOkResponse({ type: ProductDto })
  @ApiProblemResponses(404)
  async get(@Id() id: string, @Reply() res: Response): Promise<ProductDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/${id}` }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change any of its fields; specs are checked again' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  @ApiProblemResponses(
    [400, SPECS_400],
    [409, 'The slug or SKU is taken, or the category has subcategories'],
  )
  async update(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Body() body: UpdateProductDto,
    @Reply() res: Response,
  ): Promise<ProductDto> {
    return relay(
      res,
      await this.catalog.forward('PATCH', { path: `${base}/${id}`, body, ifMatch }),
    );
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Show the product on the storefront' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  async publish(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<ProductDto> {
    return relay(
      res,
      await this.catalog.forward('POST', { path: `${base}/${id}/publish`, ifMatch }),
    );
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hide the product from the storefront' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  async unpublish(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<ProductDto> {
    return relay(
      res,
      await this.catalog.forward('POST', { path: `${base}/${id}/unpublish`, ifMatch }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiNoContentResponse({ description: 'Deleted; it can be restored' })
  @ApiVersionedWrite()
  async remove(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<void> {
    relay(res, await this.catalog.forward('DELETE', { path: `${base}/${id}`, ifMatch }));
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a deleted product' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([
    409,
    'The slug or SKU is taken, its brand or category is deleted, or its specs no longer fit',
  ])
  async restore(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<ProductDto> {
    return relay(
      res,
      await this.catalog.forward('POST', { path: `${base}/${id}/restore`, ifMatch }),
    );
  }
}
