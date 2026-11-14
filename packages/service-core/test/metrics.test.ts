import 'reflect-metadata';
import { type Server } from 'node:http';
import { Controller, Get, type INestApplication, Module, Param } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Metrics, MetricsController, Public } from '../src/index.js';

@Controller('items')
@Public()
class ItemsController {
  @Get(':id')
  one(@Param('id') id: string): { id: string } {
    return { id };
  }
}

// What the service-core module will wire up (a later step), assembled by hand here.
@Module({
  controllers: [MetricsController, ItemsController],
  providers: [{ provide: Metrics, useFactory: () => new Metrics('test-service') }],
})
class TestModule {}

/** The value of a sample with these labels, whatever order prom-client prints them in. */
function sample(text: string, name: string, labels: Record<string, string>): number | undefined {
  const wanted = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
  const line = text
    .split('\n')
    .find((l) => l.startsWith(`${name}{`) && wanted.every((w) => l.includes(w)));
  return line === undefined ? undefined : Number(line.split(' ').at(-1));
}

const ITEM = { method: 'GET', route: '/items/:id', status_code: '200', service: 'test-service' };

describe('metrics (FR-030)', () => {
  let app: INestApplication;
  let text: string;
  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    app.use(app.get(Metrics).middleware);
    await app.init();
    await http().get('/items/42').expect(200);
    await http().get('/items/77').expect(200);
    await http().get('/nowhere').expect(404);
    await http().get('/metrics').expect(200); // not counted itself
    const res = await http().get('/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/plain; version=0\.0\.4/);
    text = res.text;
  });

  afterAll(() => app?.close());

  it('counts requests by method, route template and status code', () => {
    expect(sample(text, 'http_requests_total', ITEM)).toBe(2);
    expect(
      sample(text, 'http_requests_total', { ...ITEM, route: 'unmatched', status_code: '404' }),
    ).toBe(1);
  });

  it('never uses a concrete URL as a label', () => {
    expect(text).not.toContain('/items/42');
    expect(text).not.toContain('/nowhere');
  });

  it('records request durations as a histogram', () => {
    expect(text).toContain('# TYPE http_request_duration_seconds histogram');
    expect(sample(text, 'http_request_duration_seconds_count', ITEM)).toBe(2);
  });

  it('does not count its own endpoints', () => {
    expect(text).not.toContain('route="/metrics"');
  });

  it('has the standard process and runtime metrics', () => {
    expect(text).toContain('process_cpu_seconds_total');
    expect(text).toContain('nodejs_eventloop_lag_seconds');
  });

  it('keeps each app apart: a second registry starts empty', async () => {
    const other = new Metrics('other-service');
    expect(await other.registry.getSingleMetricAsString('http_requests_total')).not.toContain(
      'items',
    );
  });
});
