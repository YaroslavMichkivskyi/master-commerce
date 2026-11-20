import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CategoryDetailDto,
  CategoryTreeDto,
  CreateCategoryDto,
  ReplaceAttributesDto,
  UpdateCategoryDto,
} from '@master-commerce/dto';
import { ApiProblemResponses, ApiVersionedWrite } from '@master-commerce/service-core';
import type { Response } from 'express';
import { CatalogClient } from '../catalog.client.js';
import { ADMIN_PREFIX, AdminForward, Id, IfMatch, relay, Reply, Slug } from './relay.js';

const base = '/admin/categories';

@ApiTags('admin: categories')
@Controller(`${ADMIN_PREFIX}/categories`)
@AdminForward()
export class AdminCategoriesController {
  constructor(private readonly catalog: CatalogClient) {}

  @Post()
  @ApiOperation({ summary: 'Create a category, at the top or under a parent' })
  @ApiCreatedResponse({ type: CategoryDetailDto })
  @ApiProblemResponses(
    [404, 'The parent does not exist'],
    [409, 'The slug is taken, or the parent holds products'],
  )
  async create(
    @Body() body: CreateCategoryDto,
    @Reply() res: Response,
  ): Promise<CategoryDetailDto> {
    return relay(res, await this.catalog.forward('POST', { path: base, body }));
  }

  @Get('tree')
  @ApiOperation({ summary: 'The whole category tree, each node with its own attributes' })
  @ApiOkResponse({ type: CategoryTreeDto })
  async tree(@Reply() res: Response): Promise<CategoryTreeDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/tree` }));
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a category by its current or a former slug' })
  @ApiOkResponse({ type: CategoryDetailDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  async getBySlug(@Slug() slug: string, @Reply() res: Response): Promise<CategoryDetailDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/by-slug/${slug}` }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a category with its own and inherited attributes' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiProblemResponses(404)
  async get(@Id() id: string, @Reply() res: Response): Promise<CategoryDetailDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/${id}` }));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename, reorder, change the slug or move a category (`parentId`, null: top)',
  })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([
    409,
    'A cycle, a new parent that holds products, products that would break, or the slug is taken',
  ])
  async update(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Body() body: UpdateCategoryDto,
    @Reply() res: Response,
  ): Promise<CategoryDetailDto> {
    return relay(
      res,
      await this.catalog.forward('PATCH', { path: `${base}/${id}`, body, ifMatch }),
    );
  }

  @Put(':id/attributes')
  @ApiOperation({
    summary: "Replace a category's own attributes as a set; needs the category's version",
  })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([
    409,
    'A code would repeat along a path, or products of the subtree would become invalid',
  ])
  async replaceAttributes(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Body() body: ReplaceAttributesDto,
    @Reply() res: Response,
  ): Promise<CategoryDetailDto> {
    return relay(
      res,
      await this.catalog.forward('PUT', { path: `${base}/${id}/attributes`, body, ifMatch }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a category with no subcategories and no products' })
  @ApiNoContentResponse({ description: 'Deleted; it can be restored' })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'It has subcategories or products'])
  async remove(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<void> {
    relay(res, await this.catalog.forward('DELETE', { path: `${base}/${id}`, ifMatch }));
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a deleted category under its live parent' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'The slug is taken, or the parent is deleted or holds products'])
  async restore(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<CategoryDetailDto> {
    return relay(
      res,
      await this.catalog.forward('POST', { path: `${base}/${id}/restore`, ifMatch }),
    );
  }
}
