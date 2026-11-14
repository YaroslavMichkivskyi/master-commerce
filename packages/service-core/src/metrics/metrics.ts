import type { IncomingMessage, ServerResponse } from 'node:http';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import { Public } from '../openapi.js';
import { isServiceCorePath, routeOf } from '../routes.js';

const LABELS = ['method', 'route', 'status_code'] as const;
type Label = (typeof LABELS)[number];

/**
 * The metrics of one app (FR-030). Its own registry, not prom-client's global one, so
 * several apps in one process (tests) do not collide.
 */
export class Metrics {
  readonly registry = new Registry();
  private readonly requests: Counter<Label>;
  private readonly duration: Histogram<Label>;

  constructor(service: string) {
    this.registry.setDefaultLabels({ service });
    collectDefaultMetrics({ register: this.registry });
    this.requests = new Counter({
      name: 'http_requests_total',
      help: 'HTTP requests handled, by method, route template and status code',
      labelNames: LABELS,
      registers: [this.registry],
    });
    this.duration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds, by method, route template and status code',
      labelNames: LABELS,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
  }

  /** Middleware: records every request except the service-core endpoints. */
  readonly middleware = (
    req: IncomingMessage & { originalUrl?: string },
    res: ServerResponse,
    next: () => void,
  ): void => {
    if (isServiceCorePath(req.originalUrl ?? req.url)) return next();
    const end = this.duration.startTimer();
    res.once('finish', () => {
      const labels = { method: req.method, route: routeOf(req), status_code: res.statusCode };
      end(labels);
      this.requests.inc(labels);
    });
    next();
  };
}

/** `GET /metrics` in the Prometheus text format (FR-030, FR-052). */
@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: Metrics) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics: process, runtime and HTTP requests' })
  @ApiProduces('text/plain')
  @ApiOkResponse({ description: 'Prometheus text exposition format', schema: { type: 'string' } })
  scrape(): Promise<string> {
    return this.metrics.registry.metrics();
  }
}
