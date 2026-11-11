import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryListDto, ProblemDto } from '@master-commerce/dto';
import { CategoriesService } from './categories.service.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List product categories in display order' })
  @ApiOkResponse({ type: CategoryListDto })
  @ApiInternalServerErrorResponse({ type: ProblemDto, description: 'Unexpected error' })
  list(): Promise<CategoryListDto> {
    return this.categories.list();
  }
}
