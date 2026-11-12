import { Controller, Get, UseFilters } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryListDto, ProblemDto } from '@master-commerce/dto';
import { ProblemFilter } from '../common/problem.filter.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('categories')
@Controller('categories')
@UseFilters(ProblemFilter)
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
