import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { ApiProblemResponses, ApiVersionedWrite, Public } from '@master-commerce/service-core';
import { AdminApi } from '../common/http.js';
import { expectedVersion } from '../common/versioning.js';
import { BrandsService } from './brands.service.js';

const Id = () => Param('id', new ParseUUIDPipe());

// Public until sign-in exists (TASK-7); the gateway is the only door from outside.
@ApiTags('admin: brands')
@Controller('admin/brands')
@Public()
@AdminApi()
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a brand' })
  @ApiCreatedResponse({ type: BrandDto })
  @ApiProblemResponses([409, 'The slug is taken, now or formerly, by another brand'])
  create(@Body() body: CreateBrandDto): Promise<BrandDto> {
    return this.brands.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List brands, a page at a time, in creation order' })
  @ApiOkResponse({ type: BrandPageDto })
  list(@Query() query: PageQueryDto): Promise<BrandPageDto> {
    return this.brands.list(query);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a brand by its current or a former slug' })
  @ApiOkResponse({ type: BrandDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  getBySlug(@Param('slug') slug: string): Promise<BrandDto> {
    return this.brands.getBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a brand' })
  @ApiOkResponse({ type: BrandDto })
  @ApiProblemResponses(404)
  get(@Id() id: string): Promise<BrandDto> {
    return this.brands.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a brand or change its slug; the old slug keeps working' })
  @ApiOkResponse({ type: BrandDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'The slug is taken, now or formerly, by another brand'])
  update(
    @Id() id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: UpdateBrandDto,
  ): Promise<BrandDto> {
    return this.brands.update(id, expectedVersion(ifMatch), body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a brand no live product uses' })
  @ApiNoContentResponse({ description: 'Deleted; it can be restored' })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'Products use this brand'])
  remove(@Id() id: string, @Headers('if-match') ifMatch: string | undefined): Promise<void> {
    return this.brands.remove(id, expectedVersion(ifMatch));
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a deleted brand' })
  @ApiOkResponse({ type: BrandDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'Another brand has taken its slug'])
  restore(@Id() id: string, @Headers('if-match') ifMatch: string | undefined): Promise<BrandDto> {
    return this.brands.restore(id, expectedVersion(ifMatch));
  }
}
