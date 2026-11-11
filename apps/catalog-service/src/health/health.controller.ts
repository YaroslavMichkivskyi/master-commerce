import { Controller, Get, Inject } from '@nestjs/common';
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
      return indicator.down({ message: (error as Error).message });
    }
  }
}
