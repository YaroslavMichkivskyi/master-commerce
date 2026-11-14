import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Header that carries the correlation id between callers and services (FR-011). */
export const REQUEST_ID_HEADER = 'x-request-id';

// A caller's id is kept only if it is short and plain, so it is safe in logs and headers.
const WELL_FORMED = /^[A-Za-z0-9._:-]{1,128}$/;

const storage = new AsyncLocalStorage<{ requestId: string }>();

/** The incoming id if well-formed, a new UUID otherwise. */
export function requestIdFrom(header: unknown): string {
  return typeof header === 'string' && WELL_FORMED.test(header) ? header : randomUUID();
}

/**
 * First middleware of every request: fixes its id, returns it in the response header and
 * keeps it for the whole call chain, where the logger and `correlationHeaders()` read it.
 * Plain Node types: it works as Express middleware and on a bare HTTP server alike.
 */
export function requestContext(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const id = requestIdFrom(req.headers[REQUEST_ID_HEADER]);
  res.setHeader(REQUEST_ID_HEADER, id);
  storage.run({ requestId: id }, next);
}

/** The id of the request being handled, if any. */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Headers to add to a call to another service, so it logs the same id (FR-012). */
export function correlationHeaders(): Record<string, string> {
  const id = currentRequestId();
  return id ? { [REQUEST_ID_HEADER]: id } : {};
}
