import { PAGE_SIZE_DEFAULT } from '@master-commerce/dto';
import { gt, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/** A page of a list (FR-034, research R-6). */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** How a list query pages: `WHERE id > cursor ORDER BY id LIMIT size + 1`. */
export interface PageWindow {
  size: number;
  /** `undefined` on the first page; `and()` skips it. */
  after: SQL | undefined;
  /** One more than the page, to know whether another page follows. */
  fetch: number;
}

export function pageWindow(idColumn: PgColumn, limit?: number, cursor?: string): PageWindow {
  const size = limit ?? PAGE_SIZE_DEFAULT;
  return { size, after: cursor ? gt(idColumn, cursor) : undefined, fetch: size + 1 };
}

/** Cuts the extra row off and points the cursor at the last item kept. */
export function toPage<T extends { id: string }>(rows: readonly T[], size: number): Page<T> {
  const more = rows.length > size;
  const items = more ? rows.slice(0, size) : [...rows];
  return { items, nextCursor: more ? items[items.length - 1]!.id : null };
}
