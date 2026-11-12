import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import { PROBLEM_CONTENT_TYPE } from '@master-commerce/dto';
import type { Request, Response } from 'express';
import { toProblem } from './problem.js';

/**
 * Errors of the API routes as `application/problem+json` (contracts/http.md). Applied per
 * controller, not globally: `/health` keeps the terminus body. The service chassis
 * (TASK-3) moves this into a shared package for every service.
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const body = toProblem(error, req.originalUrl);
    if (body.status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${body.status}`,
        (error as Error)?.stack,
      );
    }
    res.status(body.status).type(PROBLEM_CONTENT_TYPE).send(JSON.stringify(body));
  }
}
