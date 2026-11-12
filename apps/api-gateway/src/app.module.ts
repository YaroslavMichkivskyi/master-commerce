import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ROOT_ENV_FILE } from './config.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: [ROOT_ENV_FILE] }), CatalogModule],
  controllers: [HealthController],
})
export class AppModule {}
