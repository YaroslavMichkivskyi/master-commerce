import { Injectable } from '@nestjs/common';
import { CategoryListDto } from '@master-commerce/dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { correlationHeaders } from '@master-commerce/service-core';
import { GatewayEnv } from '../env.js';
import {
  UpstreamBadResponseError,
  UpstreamProblem,
  UpstreamUnavailableError,
} from './upstream.errors.js';

const UPSTREAM = 'catalog-service';

export type ForwardMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ForwardRequest {
  /** The catalog's path, e.g. `/admin/brands/<id>`; ids are validated by the caller. */
  path: string;
  /** Defined values only; each is sent as its string form. */
  query?: object;
  body?: unknown;
  ifMatch?: string;
}

/** A `2xx` of the catalog, to be answered as is. */
export interface Forwarded {
  status: number;
  /** `undefined` for `204`. */
  body: unknown;
  etag: string | null;
}

/**
 * Client of catalog-service. The public list is checked against the shared DTO; the
 * admin API is forwarded as the catalog answers it (`forward`).
 */
@Injectable()
export class CatalogClient {
  constructor(private readonly env: GatewayEnv) {}

  async listCategories(): Promise<CategoryListDto> {
    const body = await this.get('/categories');
    // class-validator throws (not reports) on a non-object such as `null`.
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new UpstreamBadResponseError(UPSTREAM, 'body is not a JSON object');
    }
    const dto = plainToInstance(CategoryListDto, body);
    // `whitelist` strips fields the DTO does not declare: whatever the catalog adds later
    // never reaches the public API unless the shared contract is changed first.
    const errors = await validate(dto, { forbidUnknownValues: true, whitelist: true });
    if (errors.length > 0) {
      throw new UpstreamBadResponseError(UPSTREAM, 'body does not match CategoryListDto');
    }
    return dto;
  }

  /**
   * Sends a request of the admin API on to the catalog (research R-11, ADR 0021): a `2xx`
   * comes back with its body and `ETag`; a `4xx` problem is the answer and is thrown as
   * such (status, detail, `errors[]`); a `5xx` or an unusable answer → `502`; no answer
   * in time → `503`.
   */
  async forward(method: ForwardMethod, request: ForwardRequest): Promise<Forwarded> {
    const url = new URL(request.path, this.env.CATALOG_SERVICE_URL);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const hasBody = request.body !== undefined;
    const res = await this.send(url, {
      method,
      headers: {
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...(request.ifMatch === undefined ? {} : { 'if-match': request.ifMatch }),
      },
      ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
    });

    if (res.status >= 400 && res.status < 500) {
      throw UpstreamProblem.from(res.status, await this.readJson(res).catch(() => undefined));
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw new UpstreamBadResponseError(UPSTREAM, `HTTP ${res.status}`);
    }
    const body = res.status === 204 ? undefined : await this.readJson(res);
    return { status: res.status, body, etag: res.headers.get('etag') };
  }

  private async get(path: string): Promise<unknown> {
    const res = await this.send(new URL(path, this.env.CATALOG_SERVICE_URL), { method: 'GET' });
    if (!res.ok) {
      // The error body is not used; cancel it so the connection is freed at once.
      await res.body?.cancel().catch(() => undefined);
      throw new UpstreamBadResponseError(UPSTREAM, `HTTP ${res.status}`);
    }
    return this.readJson(res);
  }

  private async send(url: URL, init: RequestInit & { headers?: Record<string, string> }) {
    try {
      return await fetch(url, {
        ...init,
        // The caller's request id goes along, so both services log it (FR-012).
        headers: { accept: 'application/json', ...init.headers, ...correlationHeaders() },
        signal: AbortSignal.timeout(this.env.UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      throw new UpstreamUnavailableError(UPSTREAM, { cause: error });
    }
  }

  private async readJson(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch (error) {
      // The timeout also covers reading the body: a slow body is "unavailable", not "bad".
      if (isAbort(error)) throw new UpstreamUnavailableError(UPSTREAM, { cause: error });
      throw new UpstreamBadResponseError(UPSTREAM, 'body is not JSON');
    }
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}
