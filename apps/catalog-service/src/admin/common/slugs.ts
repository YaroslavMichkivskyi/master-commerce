import { ConflictException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { formerSlug, type SlugKind } from '../../db/schema.js';
import type { Executor } from './executor.js';

// Former slugs (FR-025, research R-10). Every function runs inside the caller's
// transaction; a transaction-scoped advisory lock per slug makes "is it free?" and
// "take it" one step for concurrent writers.

async function lockSlug(tx: Executor, kind: SlugKind, slug: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`slug:${kind}:${slug}`}))`);
}

/** `409` when `slug` is a former slug of another entity of this kind. */
export async function assertSlugFree(
  tx: Executor,
  kind: SlugKind,
  slug: string,
  entityId?: string,
): Promise<void> {
  await lockSlug(tx, kind, slug);
  const [former] = await tx
    .select({ entityId: formerSlug.entityId })
    .from(formerSlug)
    .where(and(eq(formerSlug.kind, kind), eq(formerSlug.slug, slug)));
  if (former && former.entityId !== entityId) {
    throw new ConflictException(
      `The slug "${slug}" belonged to another ${kind}; old links still lead there`,
    );
  }
}

/**
 * Records `from` as a former slug of the entity, after checking `to` is free for it. Its
 * own former slug can be taken back; the row stays (the role has no DELETE) and lookups
 * find the live entity by its current slug first.
 */
export async function changeSlug(
  tx: Executor,
  kind: SlugKind,
  entityId: string,
  from: string,
  to: string,
): Promise<void> {
  if (from === to) return;
  await assertSlugFree(tx, kind, to, entityId);
  await lockSlug(tx, kind, from);
  await tx
    .insert(formerSlug)
    .values({ kind, slug: from, entityId })
    .onConflictDoUpdate({
      target: [formerSlug.kind, formerSlug.slug],
      set: { retiredAt: sql`now()` },
      setWhere: eq(formerSlug.entityId, entityId),
    });
}

/** The entity a former slug belongs to, if any. */
export async function entityOfFormerSlug(
  tx: Executor,
  kind: SlugKind,
  slug: string,
): Promise<string | undefined> {
  const [former] = await tx
    .select({ entityId: formerSlug.entityId })
    .from(formerSlug)
    .where(and(eq(formerSlug.kind, kind), eq(formerSlug.slug, slug)));
  return former?.entityId;
}
