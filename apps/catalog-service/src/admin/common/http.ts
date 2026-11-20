import {
  applyDecorators,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiProblemResponses } from '@master-commerce/service-core';
import type { Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { etag } from './versioning.js';

/**
 * Sends `ETag: "<version>"` with every single-entity response (FR-033). A page has no
 * `version` of its own, so it gets none.
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap((body) => {
        const version = (body as { version?: unknown } | undefined)?.version;
        if (typeof version === 'number') {
          context.switchToHttp().getResponse<Response>().setHeader('ETag', etag(version));
        }
      }),
    );
  }
}

/** The interceptor and the shared answers of an admin controller. */
export const AdminApi = () =>
  applyDecorators(UseInterceptors(EtagInterceptor), ApiProblemResponses(400));
