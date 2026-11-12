import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import { PROBLEM_CONTENT_TYPE } from '@master-commerce/dto';
import type { Request, Response } from 'express';
import { toProblem } from './problem.js';

@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const body = toProblem(error, req.originalUrl);

    const line = `${req.method} ${req.originalUrl} -> ${body.status}`;
    if (body.status === 502 || body.status === 503) {
      // An expected upstream failure: one line, no stack trace.
      this.logger.warn(`${line}: ${(error as Error).message}`);
    } else if (body.status >= 500) {
      this.logger.error(line, (error as Error)?.stack);
    }
    res.status(body.status).type(PROBLEM_CONTENT_TYPE).send(JSON.stringify(body));
  }
}
