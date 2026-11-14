import type { IncomingMessage } from 'node:http';

/** The endpoints service-core adds: not counted in metrics, not logged per request. */
export function isServiceCorePath(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0] ?? '';
  return /^\/(health|metrics|docs)(\/|-json|$)/.test(path);
}

/**
 * The route template that matched (`/api/v1/categories/:id`), never the concrete URL, so
 * ids do not explode log fields or metric labels; `unmatched` for unknown routes.
 */
export function routeOf(req: IncomingMessage): string {
  const r = req as IncomingMessage & { baseUrl?: string; route?: { path?: unknown } };
  const path = r.route?.path;
  // Nest answers unknown routes from a catch-all route, `{/*splat}` on Express 5.
  if (typeof path !== 'string' || path.startsWith('{/*')) return 'unmatched';
  return `${r.baseUrl ?? ''}${path}`;
}
