import { type INestApplication } from '@nestjs/common';
import { createServiceApp } from '@master-commerce/service-core';
import { AppModule } from './app.module.js';

/** Builds the app exactly as `main.ts` runs it, without listening; for integration tests. */
export function createApp(): Promise<INestApplication> {
  return createServiceApp(AppModule);
}
