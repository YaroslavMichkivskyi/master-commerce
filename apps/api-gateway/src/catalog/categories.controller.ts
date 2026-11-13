import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryListDto } from '@master-commerce/dto';
import { ApiProblemResponses, Public } from '@master-commerce/service-core';
import { CatalogClient } from './catalog.client.js';

@ApiTags('catalog')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly catalog: CatalogClient) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List product categories in display order' })
  @ApiOkResponse({ type: CategoryListDto })
  @ApiProblemResponses(
    [502, 'catalog-service answered with an error'],
    [503, 'catalog-service is unreachable or timed out'],
  )
  list(): Promise<CategoryListDto> {
    return this.catalog.listCategories();
  }
}
