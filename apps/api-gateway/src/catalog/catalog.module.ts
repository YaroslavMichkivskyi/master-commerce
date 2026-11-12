import { Module } from '@nestjs/common';
import { CatalogClient } from './catalog.client.js';
import { CategoriesController } from './categories.controller.js';

@Module({
  controllers: [CategoriesController],
  providers: [CatalogClient],
})
export class CatalogModule {}
