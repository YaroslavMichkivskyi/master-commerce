import 'reflect-metadata';
import { type Server } from 'node:http';
import { Controller, Get, type INestApplication, Module, Param, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiProblemResponses, Public, setupOpenApi } from '../src/index.js';

interface Operation {
  description?: string;
  security?: unknown[];
  responses: Record<string, { description: string; content?: Record<string, unknown> }>;
}

interface Document {
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
}

const PROBLEM = {
  'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDto' } },
};

@Controller('things')
@Public()
class ThingsController {
  @Get(':id')
  @ApiOperation({ summary: 'One thing', description: 'Reads a thing.' })
  @ApiOkResponse({ description: 'The thing' })
  @ApiProblemResponses(404, [503, 'stock-service is unreachable'])
  one(@Param('id') id: string): { id: string } {
    return { id };
  }

  @Post()
  create(): void {}
}

@Controller('other')
class OtherController {
  @Get()
  @Public()
  list(): string[] {
    return [];
  }
}

@Controller('forgotten')
class ForgottenController {
  @Get()
  list(): string[] {
    return [];
  }
}

@Module({ controllers: [ThingsController, OtherController] })
class MarkedModule {}

@Module({ controllers: [OtherController, ForgottenController] })
class UnmarkedModule {}

const INFO = { service: 'test-service', version: '1.2.3', description: 'A test API.' };

describe('setupOpenApi (FR-050…FR-052)', () => {
  let app: INestApplication;
  let doc: Document;
  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    app = await NestFactory.create(MarkedModule, { logger: false });
    setupOpenApi(app, INFO);
    await app.init();
    doc = (await http().get('/docs-json').expect(200)).body as Document;
  });

  afterAll(() => app?.close());

  it('serves Swagger UI at /docs', async () => {
    const res = await http().get('/docs').expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('names the service and its version, and explains errors and X-Request-Id', () => {
    expect(doc.info).toMatchObject({ title: 'test-service', version: '1.2.3' });
    expect(doc.info.description).toContain('A test API.');
    expect(doc.info.description).toContain('RFC 9457');
    expect(doc.info.description).toContain('X-Request-Id');
  });

  it('has the shared problem schemas', () => {
    expect(doc.components.schemas).toHaveProperty('ProblemDto');
    expect(doc.components.schemas).toHaveProperty('FieldErrorDto');
  });

  it('marks public endpoints: empty security and a line in the description', () => {
    const one = doc.paths['/things/{id}']?.get;
    expect(one?.security).toEqual([]);
    expect(one?.description).toBe('Reads a thing.\n\n**Auth:** public, no credentials needed.');
    // A class-level @Public() covers every endpoint of the controller.
    expect(doc.paths['/things']?.post?.security).toEqual([]);
    expect(doc.paths['/other']?.get?.security).toEqual([]);
  });

  it('documents the declared problem answers with the shared schema', () => {
    const responses = doc.paths['/things/{id}']?.get?.responses ?? {};
    expect(responses['404']).toEqual({ description: 'Not Found', content: PROBLEM });
    expect(responses['503']).toEqual({
      description: 'stock-service is unreachable',
      content: PROBLEM,
    });
  });

  it('adds the 500 problem answer to every operation', () => {
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item)) {
        expect(op.responses['500']?.content, `${method} ${path}`).toEqual(PROBLEM);
      }
    }
  });
});

describe('an endpoint without @Public() (FR-051)', () => {
  it('stops the set-up and names the endpoint', async () => {
    const app = await NestFactory.create(UnmarkedModule, { logger: false });
    try {
      expect(() => setupOpenApi(app, INFO)).toThrow(
        'Endpoints without an auth requirement (mark them @Public()): GET /forgotten',
      );
    } finally {
      await app.close();
    }
  });
});
