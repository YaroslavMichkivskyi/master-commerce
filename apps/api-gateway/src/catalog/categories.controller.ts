import { Controller, Get } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryListDto, ProblemDto } from '@master-commerce/dto';
import { CatalogClient } from './catalog.client.js';

@ApiTags('catalog')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly catalog: CatalogClient) {}

  @Get()
  @ApiOperation({ summary: 'List product categories in display order' })
  @ApiOkResponse({ type: CategoryListDto })
  @ApiBadGatewayResponse({
    type: ProblemDto,
    description: 'catalog-service answered with an error',
  })
  @ApiServiceUnavailableResponse({
    type: ProblemDto,
    description: 'catalog-service is unreachable or timed out',
  })
  list(): Promise<CategoryListDto> {
    return this.catalog.listCategories();
  }
}
