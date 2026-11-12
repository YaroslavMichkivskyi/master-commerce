import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ROOT_ENV_FILE } from './config.js';
import { CategoriesModule } from './categories/categories.module.js';
import { DatabaseModule } from './db/database.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [ROOT_ENV_FILE] }),
    DatabaseModule,
    CategoriesModule,
    HealthModule,
  ],
})
export class AppModule {}
