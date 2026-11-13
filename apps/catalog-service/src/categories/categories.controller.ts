import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryListDto } from '@master-commerce/dto';
import { Public } from '@master-commerce/service-core';
import { CategoriesService } from './categories.service.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List product categories in display order' })
  @ApiOkResponse({ type: CategoryListDto })
  list(): Promise<CategoryListDto> {
    return this.categories.list();
  }
}
