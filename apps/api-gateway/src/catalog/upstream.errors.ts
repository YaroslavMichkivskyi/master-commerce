import { STATUS_CODES } from 'node:http';
import { BadGatewayException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { FieldErrorDto } from '@master-commerce/dto';

/** The upstream could not be reached or did not answer in time → 503. */
export class UpstreamUnavailableError extends ServiceUnavailableException {
  constructor(
    readonly upstream: string,
    options?: { cause?: unknown },
  ) {
    super(`${upstream} is unavailable`, { cause: options?.cause });
  }
}

/**
 * The upstream answered, but with an error or a body that breaks the contract → 502.
 * The reason goes to the log (as the cause), not to the client.
 */
export class UpstreamBadResponseError extends BadGatewayException {
  constructor(
    readonly upstream: string,
    reason: string,
  ) {
    super(`${upstream} answered with an error`, { cause: new Error(reason) });
  }
}

/**
 * A `4xx` problem of the upstream: its answer to the client, passed on with its status,
 * detail and `errors[]`. The gateway's problem filter writes the body again, so `instance`
 * is the path the client called.
 */
export class UpstreamProblem extends HttpException {
  static from(status: number, body: unknown): UpstreamProblem {
    const problem = (typeof body === 'object' && body !== null ? body : {}) as {
      detail?: unknown;
      errors?: unknown;
    };
    const detail = typeof problem.detail === 'string' ? problem.detail : undefined;
    const errors = Array.isArray(problem.errors) ? (problem.errors as FieldErrorDto[]) : undefined;
    return new UpstreamProblem(status, detail, errors);
  }

  private constructor(status: number, detail: string | undefined, errors?: FieldErrorDto[]) {
    super(
      { message: detail ?? STATUS_CODES[status] ?? 'Error', ...(errors ? { errors } : {}) },
      status,
    );
  }
}
