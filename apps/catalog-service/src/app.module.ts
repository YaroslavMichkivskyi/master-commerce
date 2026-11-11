import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module.js';
import { DatabaseModule } from './db/database.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    // Apps run from their package folder; the shared `.env` is at the repo root.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    DatabaseModule,
    CategoriesModule,
    HealthModule,
  ],
})
export class AppModule {}
