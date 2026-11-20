import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@master-commerce/service-core';
import { BrandsModule } from './admin/brands/brands.module.js';
import { AdminCategoriesModule } from './admin/categories/admin-categories.module.js';
import { ProductsModule } from './admin/products/products.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { DatabaseModule } from './db/database.module.js';
import { DatabaseReadiness } from './db/database.readiness.js';
import { CatalogEnv, ROOT_ENV_FILE } from './env.js';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      service: 'catalog-service',
      version: '0.1.0',
      description: 'Internal API of the catalog (ADR 0014)',
      env: CatalogEnv,
      portVariable: 'CATALOG_PORT',
      envFile: ROOT_ENV_FILE,
      readiness: [DatabaseReadiness],
    }),
    DatabaseModule,
    CategoriesModule,
    BrandsModule,
    AdminCategoriesModule,
    ProductsModule,
  ],
})
export class AppModule {}
