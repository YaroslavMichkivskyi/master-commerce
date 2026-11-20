import { Module } from '@nestjs/common';
import { AdminBrandsController } from './admin/admin-brands.controller.js';
import { AdminCategoriesController } from './admin/admin-categories.controller.js';
import { AdminProductsController } from './admin/admin-products.controller.js';
import { CatalogClient } from './catalog.client.js';
import { CategoriesController } from './categories.controller.js';

@Module({
  controllers: [
    CategoriesController,
    AdminBrandsController,
    AdminCategoriesController,
    AdminProductsController,
  ],
  providers: [CatalogClient],
})
export class CatalogModule {}
