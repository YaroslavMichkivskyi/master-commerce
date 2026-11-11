import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogModule } from './catalog/catalog.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    // Apps run from their package folder; the shared `.env` is at the repo root.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    CatalogModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
