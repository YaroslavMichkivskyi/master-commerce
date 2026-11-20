import {
  HttpException,
  HttpStatus,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { PgColumn, PgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { Executor } from './executor.js';

/** The `ETag` of a version: `"3"` (FR-033, research R-4). */
export const etag = (version: number): string => `"${version}"`;

/**
 * The version a change is based on, from `If-Match`. Missing → `428`; anything that is
 * not one version (`*`, a list, garbage) matches no version → `412`.
 *
 * A weak `W/"3"` is read as version 3, on purpose: RFC 9110 compares `If-Match` strongly,
 * but a proxy that compresses responses weakens the ETags it passes on, and a client
 * behind it could then never change anything. Our version is exact either way.
 */
export function expectedVersion(ifMatch: string | undefined): number {
  if (ifMatch === undefined || ifMatch.trim() === '') {
    throw new HttpException(
      'This change needs If-Match with the version you read, e.g. If-Match: "3"',
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  const match = /^\s*(?:W\/)?"([1-9]\d{0,8})"\s*$/.exec(ifMatch);
  if (!match) {
    throw new PreconditionFailedException(`If-Match ${ifMatch} matches no version`);
  }
  return Number(match[1]);
}

/** A table with the common columns of an entity. */
export type VersionedTable = PgTable & {
  id: PgColumn;
  version: PgColumn;
  updatedAt: PgColumn;
  deletedAt: PgColumn;
};

/**
 * `UPDATE … WHERE id = $id AND version = $expected`, bumping the version and the update
 * time in the same statement (research R-4). No row → `404` when the entity is not
 * there (in the given state), `412` when it is there with another version.
 */
export async function updateVersioned<T extends VersionedTable>(
  db: Executor,
  table: T,
  what: string,
  id: string,
  expected: number,
  values: PgUpdateSetSource<T>,
  state: 'live' | 'deleted' = 'live',
): Promise<T['$inferSelect']> {
  const inState = state === 'live' ? isNull(table.deletedAt) : isNotNull(table.deletedAt);
  const set = {
    ...values,
    version: sql`${table.version} + 1`,
    updatedAt: sql`now()`,
  } as PgUpdateSetSource<T>;
  const rows = (await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.version, expected), inState))
    .returning()) as T['$inferSelect'][];
  if (rows[0]) return rows[0];

  const source: PgTable = table; // the generic T is too wide for from()'s typing
  const current = await db
    .select({ version: table.version })
    .from(source)
    .where(and(eq(table.id, id), inState));
  if (!current[0]) {
    throw new NotFoundException(
      state === 'live' ? `${what} ${id} does not exist` : `${what} ${id} is not deleted`,
    );
  }
  throw new PreconditionFailedException(
    `${what} ${id} has changed since you read it: its version is ` +
      `${String(current[0].version)}, your change was based on ${expected}`,
  );
}
