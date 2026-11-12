import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  type HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import pg from 'pg';
import { PG_POOL } from '../db/database.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    @Inject(PG_POOL) private readonly pool: pg.Pool,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness and database reachability' })
  @ApiServiceUnavailableResponse({ description: 'The database is unreachable' })
  check() {
    return this.health.check([() => this.database()]);
  }

  private async database(): Promise<HealthIndicatorResult> {
    const indicator = this.indicator.check('database');
    try {
      await this.pool.query('select 1');
      return indicator.up();
    } catch (error) {
      // The driver's message names the host and the database user: log it, never return it.
      this.logger.warn(`database check failed: ${(error as Error).message}`);
      return indicator.down({ message: 'database unreachable' });
    }
  }
}
