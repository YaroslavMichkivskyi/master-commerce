import { Injectable } from '@nestjs/common';
import { CategoryListDto } from '@master-commerce/dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { correlationHeaders } from '@master-commerce/service-core';
import { GatewayEnv } from '../env.js';
import { UpstreamBadResponseError, UpstreamUnavailableError } from './upstream.errors.js';

const UPSTREAM = 'catalog-service';

/** Typed client of catalog-service; the response is checked against the shared DTO. */
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

  private async get(path: string): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(new URL(path, this.env.CATALOG_SERVICE_URL), {
        // The caller's request id goes along, so both services log it (FR-012).
        headers: { accept: 'application/json', ...correlationHeaders() },
        signal: AbortSignal.timeout(this.env.UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      throw new UpstreamUnavailableError(UPSTREAM, { cause: error });
    }
    if (!res.ok) {
      // The error body is not used; cancel it so the connection is freed at once.
      await res.body?.cancel().catch(() => undefined);
      throw new UpstreamBadResponseError(UPSTREAM, `HTTP ${res.status}`);
    }
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
