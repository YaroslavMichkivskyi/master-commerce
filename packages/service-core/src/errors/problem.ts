import { STATUS_CODES } from 'node:http';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { FieldErrorDto, ProblemDto } from '@master-commerce/dto';

/**
 * Any thrown value → RFC 9457 body (FR-040). An `HttpException` is thrown on purpose, so
 * its status and message are the answer (`503 catalog-service is unavailable`); anything
 * else is a bug: `500` with no detail. A `500` never has a detail, even when thrown on
 * purpose: its message is often an internal one (`new InternalServerErrorException(err.message)`).
 */
export function toProblem(error: unknown, instance: string): ProblemDto {
  if (!(error instanceof HttpException)) {
    return problem(HttpStatus.INTERNAL_SERVER_ERROR, instance);
  }
  const status = error.getStatus();
  const response = error.getResponse();
  const errors =
    typeof response === 'object' && Array.isArray((response as { errors?: unknown }).errors)
      ? (response as { errors: FieldErrorDto[] }).errors
      : undefined;
  const detail = status === 500 ? undefined : error.message;
  return problem(status, instance, detail, errors);
}

function problem(
  status: number,
  instance: string,
  detail?: string,
  errors?: FieldErrorDto[],
): ProblemDto {
  return {
    type: 'about:blank',
    // RFC 9457: with `about:blank` the title is the status phrase.
    title: STATUS_CODES[status] ?? 'Error',
    status,
    ...(detail ? { detail } : {}),
    instance,
    ...(errors ? { errors } : {}),
  };
}
