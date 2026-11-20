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
  CreateProductDto,
  ProductDto,
  ProductListQueryDto,
  ProductPageDto,
  UpdateProductDto,
} from '@master-commerce/dto';
import { ApiProblemResponses, ApiVersionedWrite, Public } from '@master-commerce/service-core';
import { AdminApi } from '../common/http.js';
import { expectedVersion } from '../common/versioning.js';
import { ProductsService } from './products.service.js';

const Id = () => Param('id', new ParseUUIDPipe());
const SPECS_400 = 'Invalid input, or specs that do not fit the category (`errors[]` per field)';

// Public until sign-in exists (TASK-7); the gateway is the only door from outside.
@ApiTags('admin: products')
@Controller('admin/products')
@Public()
@AdminApi()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product, unpublished, in a category without children' })
  @ApiCreatedResponse({ type: ProductDto })
  @ApiProblemResponses(
    [400, SPECS_400],
    [404, 'The brand or the category does not exist'],
    [409, 'The slug or SKU is taken, or the category has subcategories'],
  )
  create(@Body() body: CreateProductDto): Promise<ProductDto> {
    return this.products.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List products by category, brand and publication, a page at a time' })
  @ApiOkResponse({ type: ProductPageDto })
  list(@Query() query: ProductListQueryDto): Promise<ProductPageDto> {
    return this.products.list(query);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a product by its current or a former slug' })
  @ApiOkResponse({ type: ProductDto, description: 'The body has the current slug' })
  @ApiProblemResponses(404)
  getBySlug(@Param('slug') slug: string): Promise<ProductDto> {
    return this.products.getBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a product' })
  @ApiOkResponse({ type: ProductDto })
  @ApiProblemResponses(404)
  get(@Id() id: string): Promise<ProductDto> {
    return this.products.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change any of its fields; specs are checked again' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  @ApiProblemResponses(
    [400, SPECS_400],
    [409, 'The slug or SKU is taken, or the category has subcategories'],
  )
  update(
    @Id() id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.products.update(id, expectedVersion(ifMatch), body);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Show the product on the storefront' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  publish(@Id() id: string, @Headers('if-match') ifMatch: string | undefined): Promise<ProductDto> {
    return this.products.setPublished(id, expectedVersion(ifMatch), true);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hide the product from the storefront' })
  @ApiOkResponse({ type: ProductDto })
  @ApiVersionedWrite()
  unpublish(
    @Id() id: string,
    @Headers('if-match') ifMatch: string | undefined,
  ): Promise<ProductDto> {
    return this.products.setPublished(id, expectedVersion(ifMatch), false);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiNoContentResponse({ description: 'Deleted; it can be restored' })
  @ApiVersionedWrite()
  remove(@Id() id: string, @Headers('if-match') ifMatch: string | undefined): Promise<void> {
    return this.products.remove(id, expectedVersion(ifMatch));
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
  restore(@Id() id: string, @Headers('if-match') ifMatch: string | undefined): Promise<ProductDto> {
    return this.products.restore(id, expectedVersion(ifMatch));
  }
}
