import {
  applyDecorators,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
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

/** A write that needs the version it is based on: `If-Match`, `412`, `428`, `404`. */
export const VersionedWrite = () =>
  applyDecorators(
    ApiHeader({
      name: 'If-Match',
      required: true,
      description: 'The `ETag` (version) you read, e.g. `"3"`',
    }),
    ApiProblemResponses(
      404,
      [412, 'The entity has changed since you read it'],
      [428, 'If-Match is missing'],
    ),
  );
