import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';

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
