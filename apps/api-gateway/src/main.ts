import 'reflect-metadata';
import { startService } from '@master-commerce/service-core';
import { AppModule } from './app.module.js';

await startService(AppModule);
