import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { Options } from 'pino-http';
import type { BaseEnv } from './env.js';
import { currentRequestId } from './request-context.js';
import { isServiceCorePath, routeOf } from './routes.js';

const require = createRequire(import.meta.url);

// Express adds `originalUrl` (the URL before any mount point is stripped).
type Req = IncomingMessage & { originalUrl?: string };

/** Who writes the logs: the base fields of every line. */
export interface LogIdentity {
  service: string;
  version: string;
}

/** pino-http settings shared by every service (FR-010, FR-011, FR-013). */
export function httpLoggerOptions(env: BaseEnv, identity: LogIdentity): Options {
  return {
    level: env.LOG_LEVEL,
    base: { service: identity.service, version: identity.version },
    // Readable lines for a local terminal; pino-pretty is loaded only then.
    transport: env.LOG_PRETTY
      ? { target: require.resolve('pino-pretty'), options: { singleLine: true } }
      : undefined,
    // The id is fixed by the request-context middleware, which runs first and keeps it
    // for the request; the logger takes it from there.
    genReqId: () => currentRequestId() ?? randomUUID(),
    customProps: () => ({ requestId: currentRequestId() }),
    serializers: {
      req: (req: Req) => ({ method: req.method, url: req.originalUrl ?? req.url }),
      res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
    },
    // No headers are serialised above; this also covers anything logged by hand.
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
    ],
    autoLogging: { ignore: (req: Req) => isServiceCorePath(req.originalUrl ?? req.url) },
    customLogLevel: (_req: Req, res: ServerResponse, error?: Error) =>
      error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    customSuccessMessage: (req: Req, res: ServerResponse) =>
      `${req.method} ${routeOf(req)} ${res.statusCode}`,
    customErrorMessage: (req: Req, res: ServerResponse) =>
      `${req.method} ${routeOf(req)} ${res.statusCode}`,
    customSuccessObject: (req: Req, _res: ServerResponse, value: object) => ({
      ...value,
      route: routeOf(req),
    }),
    // pino-http adds a made-up "failed with status code 500" error with a stack; the error
    // filter logs the real cause, so it is dropped here.
    customErrorObject: (req: Req, _res: ServerResponse, _error: Error, value: object) => ({
      ...value,
      err: undefined,
      route: routeOf(req),
    }),
  };
}
