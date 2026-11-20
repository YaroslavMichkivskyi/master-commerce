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
  Put,
} from '@nestjs/common';
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
import { ApiProblemResponses, ApiVersionedWrite, Public } from '@master-commerce/service-core';
import { AdminApi } from '../common/http.js';
import { expectedVersion } from '../common/versioning.js';
import { AdminCategoriesService } from './admin-categories.service.js';

const Id = () => Param('id', new ParseUUIDPipe());

// Public until sign-in exists (TASK-7); the gateway is the only door from outside.
@ApiTags('admin: categories')
@Controller('admin/categories')
@Public()
@AdminApi()
export class AdminCategoriesController {
  constructor(private readonly categories: AdminCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a category, at the top or under a parent' })
  @ApiCreatedResponse({ type: CategoryDetailDto })
  @ApiProblemResponses(
    [404, 'The parent does not exist'],
    [409, 'The slug is taken, or the parent holds products'],
  )
  create(@Body() body: CreateCategoryDto): Promise<CategoryDetailDto> {
    return this.categories.create(body);
  }

  @Get('tree')
  @ApiOperation({ summary: 'The whole category tree, each node with its own attributes' })
  @ApiOkResponse({ type: CategoryTreeDto })
  tree(): Promise<CategoryTreeDto> {
    return this.categories.tree();
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a category by its current or a former slug' })
  @ApiOkResponse({ type: CategoryDetailDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  getBySlug(@Param('slug') slug: string): Promise<CategoryDetailDto> {
    return this.categories.getBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a category with its own and inherited attributes' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiProblemResponses(404)
  get(@Id() id: string): Promise<CategoryDetailDto> {
    return this.categories.get(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename, reorder, change the slug or move a category (`parentId`, null: top)',
  })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'A cycle, a new parent that holds products, or the slug is taken'])
  update(
    @Id() id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: UpdateCategoryDto,
  ): Promise<CategoryDetailDto> {
    return this.categories.update(id, expectedVersion(ifMatch), body);
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
  replaceAttributes(
    @Id() id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: ReplaceAttributesDto,
  ): Promise<CategoryDetailDto> {
    return this.categories.replaceAttributes(id, expectedVersion(ifMatch), body.attributes);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a category with no subcategories and no products' })
  @ApiNoContentResponse({ description: 'Deleted; it can be restored' })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'It has subcategories or products'])
  remove(@Id() id: string, @Headers('if-match') ifMatch: string | undefined): Promise<void> {
    return this.categories.remove(id, expectedVersion(ifMatch));
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a deleted category under its live parent' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiVersionedWrite()
  @ApiProblemResponses([409, 'The slug is taken, or the parent is deleted or holds products'])
  restore(
    @Id() id: string,
    @Headers('if-match') ifMatch: string | undefined,
  ): Promise<CategoryDetailDto> {
    return this.categories.restore(id, expectedVersion(ifMatch));
  }
}
