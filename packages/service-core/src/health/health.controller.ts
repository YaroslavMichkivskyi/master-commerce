import type { ServerResponse } from 'node:http';
import { Controller, Get, Inject, Logger, Res, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheckService,
  type HealthCheckResult,
  type HealthIndicatorFunction,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Lifecycle } from '../lifecycle.js';
import { Public } from '../openapi.js';
import { READINESS_CHECKS, type ReadinessCheck } from './readiness.js';

const EXAMPLE_UP = {
  status: 'ok',
  info: { database: { status: 'up' } },
  error: {},
  details: { database: { status: 'up' } },
};

/** Probes: answered in terminus' format, not problem+json; they are not API errors. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger('Health');

  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly lifecycle: Lifecycle,
    @Inject(READINESS_CHECKS) private readonly checks: ReadinessCheck[],
  ) {}

  /** FR-020: the process can serve requests; dependencies are not checked. */
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness: the process can serve requests' })
  @ApiOkResponse({ schema: { example: { status: 'ok', info: {}, error: {}, details: {} } } })
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  /** FR-021: every required dependency is usable and the service is not stopping. */
  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness: required dependencies are reachable' })
  @ApiOkResponse({ schema: { example: EXAMPLE_UP } })
  @ApiServiceUnavailableResponse({
    description: 'A dependency is down or the service is shutting down',
    schema: {
      example: {
        status: 'error',
        info: {},
        error: { database: { status: 'down', message: 'database unreachable' } },
        details: { database: { status: 'down', message: 'database unreachable' } },
      },
    },
  })
  async ready(
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<HealthCheckResult | string | object> {
    const indicators: HealthIndicatorFunction[] = [
      ...this.checks.map((c) => () => this.probe(c)),
      () => {
        const lifecycle = this.indicator.check('lifecycle');
        return this.lifecycle.shuttingDown
          ? lifecycle.down({ message: 'shutting down' })
          : lifecycle.up();
      },
    ];
    try {
      return await this.health.check(indicators);
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      res.statusCode = 503;
      return error.getResponse();
    }
  }

  private async probe(check: ReadinessCheck) {
    const indicator = this.indicator.check(check.name);
    try {
      await check.check();
      return indicator.up();
    } catch (error) {
      // The cause names hosts and users: log it, never return it.
      this.logger.warn(`${check.name} check failed: ${(error as Error).message}`);
      return indicator.down({ message: `${check.name} unreachable` });
    }
  }
}
