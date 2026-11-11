import { Injectable } from '@nestjs/common';
import { CategoryListDto } from '@master-commerce/dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { loadConfig } from '../config.js';
import { UpstreamBadResponseError, UpstreamUnavailableError } from './upstream.errors.js';

const UPSTREAM = 'catalog-service';

/** Typed client of catalog-service; the response is checked against the shared DTO. */
@Injectable()
export class CatalogClient {
  private readonly config = loadConfig();

  async listCategories(): Promise<CategoryListDto> {
    const body = await this.get('/categories');
    const dto = plainToInstance(CategoryListDto, body);
    const errors = await validate(dto, { forbidUnknownValues: true });
    if (errors.length > 0) {
      throw new UpstreamBadResponseError(UPSTREAM, 'body does not match CategoryListDto');
    }
    return dto;
  }

  private async get(path: string): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(new URL(path, this.config.catalogServiceUrl), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.upstreamTimeoutMs),
      });
    } catch (error) {
      throw new UpstreamUnavailableError(UPSTREAM, { cause: error });
    }
    if (!res.ok) {
      throw new UpstreamBadResponseError(UPSTREAM, `HTTP ${res.status}`);
    }
    try {
      return await res.json();
    } catch {
      throw new UpstreamBadResponseError(UPSTREAM, 'body is not JSON');
    }
  }
}
