import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PROBLEM_CONTENT_TYPE } from '@master-commerce/dto';
import { toProblem } from './problem.js';

/** Every error of every route answers as `application/problem+json` (FR-040…FR-042). */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemFilter');

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    // Express sets `originalUrl`: the path before any mount point is stripped.
    const req = http.getRequest<IncomingMessage & { originalUrl?: string }>();
    const res = http.getResponse<ServerResponse>();
    const body = toProblem(error, req.originalUrl ?? req.url ?? '');

    if (body.status >= 500) {
      if (error instanceof HttpException) {
        // Thrown on purpose (an upstream is down…): one line with its cause, no stack.
        const cause = error.cause instanceof Error ? `: ${error.cause.message}` : '';
        this.logger.warn(`${body.status} ${error.message}${cause}`);
      } else {
        // A bug: the full error with its stack goes to the log, never to the client.
        this.logger.error(error instanceof Error ? error : String(error));
      }
    }
    res.statusCode = body.status;
    res.setHeader('content-type', `${PROBLEM_CONTENT_TYPE}; charset=utf-8`);
    res.end(JSON.stringify(body));
  }
}
