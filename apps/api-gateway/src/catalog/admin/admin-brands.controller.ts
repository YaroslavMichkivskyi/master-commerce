import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  BrandDto,
  BrandPageDto,
  CreateBrandDto,
  PageQueryDto,
  UpdateBrandDto,
} from '@master-commerce/dto';
import { ApiProblemResponses, ApiVersionedWrite } from '@master-commerce/service-core';
import type { Response } from 'express';
import { CatalogClient } from '../catalog.client.js';
import { ADMIN_PREFIX, AdminForward, Id, IfMatch, relay, Reply, Slug } from './relay.js';

const base = '/admin/brands';

@ApiTags('admin: brands')
@Controller(`${ADMIN_PREFIX}/brands`)
@AdminForward()
export class AdminBrandsController {
  constructor(private readonly catalog: CatalogClient) {}

  @Post()
  @ApiOperation({ summary: 'Create a brand' })
  @ApiCreatedResponse({ type: BrandDto })
  @ApiProblemResponses([409, 'The slug is taken, now or formerly, by another brand'])
  async create(@Body() body: CreateBrandDto, @Reply() res: Response): Promise<BrandDto> {
    return relay(res, await this.catalog.forward('POST', { path: base, body }));
  }

  @Get()
  @ApiOperation({ summary: 'List brands, a page at a time, in creation order' })
  @ApiOkResponse({ type: BrandPageDto })
  async list(@Query() query: PageQueryDto, @Reply() res: Response): Promise<BrandPageDto> {
    return relay(res, await this.catalog.forward('GET', { path: base, query }));
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a brand by its current or a former slug' })
  @ApiOkResponse({ type: BrandDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  async getBySlug(@Slug() slug: string, @Reply() res: Response): Promise<BrandDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/by-slug/${slug}` }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a brand' })
  @ApiOkResponse({ type: BrandDto })
  @ApiProblemResponses(404)
  async get(@Id() id: string, @Reply() res: Response): Promise<BrandDto> {
    return relay(res, await this.catalog.forward('GET', { path: `${base}/${id}` }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a brand or change its slug; the old slug keeps working' })
  @ApiOkResponse({ type: BrandDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'The slug is taken, now or formerly, by another brand'])
  async update(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Body() body: UpdateBrandDto,
    @Reply() res: Response,
  ): Promise<BrandDto> {
    return relay(
      res,
      await this.catalog.forward('PATCH', { path: `${base}/${id}`, body, ifMatch }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a brand no live product uses' })
  @ApiNoContentResponse({ description: 'Deleted; it can be restored' })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'Products use this brand'])
  async remove(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<void> {
    relay(res, await this.catalog.forward('DELETE', { path: `${base}/${id}`, ifMatch }));
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a deleted brand' })
  @ApiOkResponse({ type: BrandDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'Another brand has taken its slug'])
  async restore(
    @Id() id: string,
    @IfMatch() ifMatch: string | undefined,
    @Reply() res: Response,
  ): Promise<BrandDto> {
    return relay(
      res,
      await this.catalog.forward('POST', { path: `${base}/${id}/restore`, ifMatch }),
    );
  }
}
