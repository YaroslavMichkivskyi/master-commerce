import { STATUS_CODES } from 'node:http';
import { HttpException, HttpStatus } from '@nestjs/common';
import { type ProblemDto } from '@master-commerce/dto';

/** Maps any thrown value to an RFC 9457 body; internals never leak to the client. */
export function toProblem(error: unknown, instance: string): ProblemDto {
  const status =
    error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  const detail = error instanceof HttpException && status < 500 ? error.message : undefined;
  return {
    type: 'about:blank',
    title: STATUS_CODES[status] ?? 'Error', // RFC 9457: with `about:blank`, the status phrase
    status,
    ...(detail ? { detail } : {}),
    instance,
  };
}
