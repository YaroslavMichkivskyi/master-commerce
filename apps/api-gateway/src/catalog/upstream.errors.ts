/** The upstream could not be reached or did not answer in time → 503. */
export class UpstreamUnavailableError extends Error {
  constructor(
    readonly upstream: string,
    options?: ErrorOptions,
  ) {
    super(`${upstream} is unavailable`, options);
  }
}

/** The upstream answered, but with an error or a body that breaks the contract → 502. */
export class UpstreamBadResponseError extends Error {
  constructor(
    readonly upstream: string,
    reason: string,
  ) {
    super(`${upstream} returned an invalid response: ${reason}`);
  }
}
