import { STATUS_CODES } from 'node:http';
import { HttpException, HttpStatus } from '@nestjs/common';
import { type ProblemDto } from '@master-commerce/dto';
import { UpstreamBadResponseError, UpstreamUnavailableError } from '../catalog/upstream.errors.js';

/** Maps any thrown value to an RFC 9457 body; internals never leak to the client. */
export function toProblem(error: unknown, instance: string): ProblemDto {
  if (error instanceof UpstreamUnavailableError) {
    return problem(HttpStatus.SERVICE_UNAVAILABLE, instance, error.message);
  }
  if (error instanceof UpstreamBadResponseError) {
    return problem(HttpStatus.BAD_GATEWAY, instance, `${error.upstream} answered with an error`);
  }
  if (error instanceof HttpException) {
    const status = error.getStatus();
    return problem(status, instance, status < 500 ? error.message : undefined);
  }
  return problem(HttpStatus.INTERNAL_SERVER_ERROR, instance);
}

function problem(status: number, instance: string, detail?: string): ProblemDto {
  return {
    type: 'about:blank',
    // RFC 9457: with `about:blank` the title is the status phrase.
    title: STATUS_CODES[status] ?? 'Error',
    status,
    ...(detail ? { detail } : {}),
    instance,
  };
}
