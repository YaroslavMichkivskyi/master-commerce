import { Inject, Injectable } from '@nestjs/common';
import { type ReadinessCheck } from '@master-commerce/service-core';
import pg from 'pg';
import { PG_POOL } from './database.js';

/** catalog-service cannot answer without its database (FR-021). */
@Injectable()
export class DatabaseReadiness implements ReadinessCheck {
  readonly name = 'database';

  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async check(): Promise<void> {
    await this.pool.query('select 1');
  }
}
