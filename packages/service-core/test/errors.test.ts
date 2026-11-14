import 'reflect-metadata';
import { type Server, type ServerResponse } from 'node:http';
import {
  Body,
  Controller,
  Get,
  HttpException,
  type INestApplication,
  InternalServerErrorException,
  type LoggerService,
  Module,
  NotFoundException,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength, ValidateNested } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProblemFilter, toProblem, validationPipe } from '../src/index.js';

describe('toProblem (FR-040)', () => {
  it('keeps the status and message of an HttpException', () => {
    expect(toProblem(new NotFoundException('no such category'), '/c/x')).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'no such category',
      instance: '/c/x',
    });
  });

  it('answers 500 without any detail for anything else', () => {
    expect(toProblem(new Error('password=hunter2'), '/x')).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/x',
    });
    expect(toProblem('a string', '/x').status).toBe(500);
  });

  it('never gives the detail of a 500, even one thrown on purpose', () => {
    const error = new InternalServerErrorException('relation "orders" does not exist');
    expect(toProblem(error, '/x')).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/x',
    });
  });

  it('titles every status with its HTTP phrase (RFC 9457)', () => {
    expect(toProblem(new HttpException('nope', 405), '/x').title).toBe('Method Not Allowed');
    expect(toProblem(new HttpException('slow down', 429), '/x').title).toBe('Too Many Requests');
  });
});

class PartDto {
  @IsString()
  @MinLength(1)
  slug!: string;
}

class CreateThingDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  count!: number;

  @ValidateNested({ each: true })
  @Type(() => PartDto)
  parts: PartDto[] = [];
}

@Controller('things')
class ThingsController {
  @Post()
  create(@Body() body: CreateThingDto): CreateThingDto {
    return body;
  }

  @Get('boom')
  boom(): never {
    throw new Error('relation "secret_table" does not exist, password=hunter2');
  }

  /** A bug wrapped on purpose: still a bug. */
  @Get('wrapped')
  wrapped(): never {
    throw new InternalServerErrorException('relation "orders" does not exist');
  }

  /** Starts a streamed answer, then fails half-way. */
  @Get('stream')
  stream(@Res() res: ServerResponse): never {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.write('first part');
    throw new Error('the source of the stream broke');
  }

  /** Starts a streamed answer, then finds out the thing is not there. */
  @Get('stream-gone')
  streamGone(@Res() res: ServerResponse): never {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.write('first part');
    throw new NotFoundException('the rest of the export is gone');
  }

  @Get('upstream')
  upstream(): never {
    throw new ServiceUnavailableException('stock-service is unavailable', {
      cause: new Error('connect ECONNREFUSED 10.0.0.5:3003'),
    });
  }
}

@Module({ controllers: [ThingsController] })
class TestModule {}

/** Collects what Nest's `Logger` writes, so the tests can read it. */
class MemoryLogger implements LoggerService {
  lines: { level: string; message: string }[] = [];
  private add = (level: string) => (message: unknown) =>
    void this.lines.push({
      level,
      message: message instanceof Error ? `${message.message}\n${message.stack}` : String(message),
    });
  log = this.add('log');
  error = this.add('error');
  warn = this.add('warn');
}

describe('ProblemFilter and validation (FR-040…FR-042)', () => {
  const logger = new MemoryLogger();
  let app: INestApplication;
  const http = () => request(app.getHttpServer() as Server);

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger });
    app.useGlobalFilters(new ProblemFilter());
    app.useGlobalPipes(validationPipe());
    await app.init();
  });

  beforeEach(() => void (logger.lines.length = 0));

  afterAll(() => app?.close());

  it('answers 400 listing every invalid field, nested ones by path', async () => {
    const res = await http()
      .post('/things')
      .send({ name: '', count: 'many', extra: true, parts: [{ slug: '' }] })
      .expect(400);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request is invalid',
      instance: '/things',
    });
    const errors = (res.body as { errors: { field: string; messages: string[] }[] }).errors;
    expect(errors.map((e) => e.field).sort()).toEqual(['count', 'extra', 'name', 'parts.0.slug']);
    expect(errors.find((e) => e.field === 'count')?.messages).toEqual([
      'count must be an integer number',
    ]);
  });

  it('lets a valid body through', async () => {
    await http().post('/things').send({ name: 'CPU', count: 2 }).expect(201);
  });

  it('answers 404 for an unknown route in the same format', async () => {
    const res = await http().get('/nowhere').expect(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({ status: 404, title: 'Not Found', instance: '/nowhere' });
  });

  it('answers 500 without internals and logs the error with its stack', async () => {
    const res = await http().get('/things/boom').expect(500);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/things/boom',
    });
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    const logged = logger.lines.find((l) => l.level === 'error');
    expect(logged?.message).toContain('secret_table');
    expect(logged?.message).toContain('at ThingsController.boom');
  });

  it('logs a 500 thrown on purpose as an error with its stack, too', async () => {
    const res = await http().get('/things/wrapped').expect(500);
    expect(res.body).not.toHaveProperty('detail');
    const logged = logger.lines.filter((l) => l.level !== 'log');
    expect(logged).toHaveLength(1);
    expect(logged[0]?.level).toBe('error');
    expect(logged[0]?.message).toContain('relation "orders" does not exist');
    expect(logged[0]?.message).toContain('at ThingsController.wrapped');
  });

  it('keeps the message of a deliberate 5xx and logs its cause in one warn line', async () => {
    const res = await http().get('/things/upstream').expect(503);
    expect(res.body).toMatchObject({ status: 503, detail: 'stock-service is unavailable' });
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
    expect(logger.lines.filter((l) => l.level !== 'log')).toEqual([
      {
        level: 'warn',
        message: '503 stock-service is unavailable: connect ECONNREFUSED 10.0.0.5:3003',
      },
    ]);
  });

  it('aborts a response already under way, so a cut body never looks complete', async () => {
    await expect(http().get('/things/stream').buffer(true)).rejects.toThrow();
    const logged = logger.lines.find((l) => l.level === 'error');
    expect(logged?.message).toContain('the source of the stream broke');
    // The app still answers.
    await http().post('/things').send({ name: 'CPU', count: 1 }).expect(201);
  });

  it('logs any error that cuts a response short, a client error too', async () => {
    await expect(http().get('/things/stream-gone').buffer(true)).rejects.toThrow();
    expect(logger.lines.filter((l) => l.level !== 'log')).toEqual([
      {
        level: 'warn',
        message:
          '404 the rest of the export is gone (response already under way, connection aborted)',
      },
    ]);
  });

  it('does not log client errors', async () => {
    await http().get('/nowhere').expect(404);
    expect(logger.lines.filter((l) => l.level !== 'log')).toEqual([]);
  });
});
