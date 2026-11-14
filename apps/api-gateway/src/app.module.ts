import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@master-commerce/service-core';
import { CatalogModule } from './catalog/catalog.module.js';
import { GatewayEnv, ROOT_ENV_FILE } from './env.js';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      service: 'api-gateway',
      version: '0.1.0',
      description: 'Public API of the shop (ADR 0014)',
      env: GatewayEnv,
      portVariable: 'GATEWAY_PORT',
      envFile: ROOT_ENV_FILE,
      // No readiness checks: an upstream outage is answered per request (502 / 503) and
      // must not take the gateway out of rotation.
    }),
    CatalogModule,
  ],
})
export class AppModule {}
