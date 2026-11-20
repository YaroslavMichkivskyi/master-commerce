import {
  applyDecorators,
  BadRequestException,
  Headers,
  Param,
  ParseUUIDPipe,
  type PipeTransform,
  Res,
} from '@nestjs/common';
import { SLUG_PATTERN } from '@master-commerce/dto';
import { ApiProblemResponses, Public } from '@master-commerce/service-core';
import type { Response } from 'express';
import type { Forwarded } from '../catalog.client.js';

/** Where the catalog's admin API is served by the gateway (research R-11). */
export const ADMIN_PREFIX = 'api/v1/admin/catalog';

/**
 * Every admin endpoint of the gateway: public until sign-in exists (TASK-7, which guards
 * this door), with the answers forwarding adds to the catalog's own.
 */
export const AdminForward = () =>
  applyDecorators(
    Public(),
    ApiProblemResponses(
      400,
      [502, 'catalog-service answered with an error'],
      [503, 'catalog-service is unreachable or timed out'],
    ),
  );

/** An id in the path; checked here, so only a UUID is put into the catalog's path. */
export const Id = () => Param('id', new ParseUUIDPipe());
/** The catalog decides: `428` when missing, `412` when stale. */
export const IfMatch = () => Headers('if-match');
/** The response, for the status and `ETag` of the catalog's answer. */
export const Reply = () => Res({ passthrough: true });

/** The catalog's answer as the gateway's: same status, same `ETag`, same body. */
export function relay<T>(res: Response, forwarded: Forwarded): T {
  res.status(forwarded.status);
  if (forwarded.etag) res.setHeader('ETag', forwarded.etag);
  return forwarded.body as T;
}

/**
 * A slug in the path, checked against the slug format before it is put into the
 * catalog's path: `..` or `a/b` would otherwise turn into another path of the catalog.
 */
class ParseSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (value.length > 100 || !SLUG_PATTERN.test(value)) {
      throw new BadRequestException(`"${value}" is not a slug`);
    }
    return value;
  }
}
export const Slug = () => Param('slug', new ParseSlugPipe());
