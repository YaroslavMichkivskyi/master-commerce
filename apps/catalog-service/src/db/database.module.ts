import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { CatalogEnv } from '../env.js';
import { createPool, DB, PG_POOL, prepareDatabase } from './database.js';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [CatalogEnv],
      useFactory: (env: CatalogEnv) => createPool(env.CATALOG_DATABASE_URL),
    },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: pg.Pool) => prepareDatabase(pool) },
  ],
  exports: [PG_POOL, DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // After the HTTP server has stopped, so in-flight requests still had the pool (FR-060).
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
