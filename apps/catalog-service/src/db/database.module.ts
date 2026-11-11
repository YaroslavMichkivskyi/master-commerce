import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { loadConfig } from '../config.js';
import { createPool, DB, PG_POOL, prepareDatabase } from './database.js';

@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: () => createPool(loadConfig().databaseUrl) },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: pg.Pool) => prepareDatabase(pool) },
  ],
  exports: [PG_POOL, DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
