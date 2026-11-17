import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { BrandDto, CreateBrandDto, PageQueryDto, UpdateBrandDto } from '@master-commerce/dto';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { DB, type Database } from '../../db/database.js';
import { brand, type BrandRow, product } from '../../db/schema.js';
import { conflictOnUnique, type Executor } from '../common/executor.js';
import { type Page, pageWindow, toPage } from '../common/paging.js';
import { assertSlugFree, changeSlug, entityOfFormerSlug } from '../common/slugs.js';
import { updateVersioned } from '../common/versioning.js';

const live = isNull(brand.deletedAt);
const taken = (slug: string) => `A brand with the slug "${slug}" already exists`;

export function toBrandDto(row: BrandRow): BrandDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

/** Brands of the admin API (FR-001, FR-002). */
@Injectable()
export class BrandsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  create(input: CreateBrandDto): Promise<BrandDto> {
    return this.db.transaction(async (tx) => {
      await assertSlugFree(tx, 'brand', input.slug);
      const [row] = await conflictOnUnique(
        () => tx.insert(brand).values({ name: input.name, slug: input.slug }).returning(),
        taken(input.slug),
      );
      return toBrandDto(row!);
    });
  }

  async list(query: PageQueryDto): Promise<Page<BrandDto>> {
    const window = pageWindow(brand.id, query.limit, query.cursor);
    const rows = await this.db
      .select()
      .from(brand)
      .where(and(live, window.after))
      .orderBy(asc(brand.id))
      .limit(window.fetch);
    const page = toPage(rows, window.size);
    return { items: page.items.map(toBrandDto), nextCursor: page.nextCursor };
  }

  async get(id: string): Promise<BrandDto> {
    const row = await this.findLive(this.db, id);
    if (!row) throw new NotFoundException(`Brand ${id} does not exist`);
    return toBrandDto(row);
  }

  /** By the current slug, else by a former one; the body has the current slug (FR-025). */
  async getBySlug(slug: string): Promise<BrandDto> {
    const [current] = await this.db
      .select()
      .from(brand)
      .where(and(live, eq(brand.slug, slug)));
    if (current) return toBrandDto(current);
    const formerOwner = await entityOfFormerSlug(this.db, 'brand', slug);
    const row = formerOwner ? await this.findLive(this.db, formerOwner) : undefined;
    if (!row) throw new NotFoundException(`No brand has the slug "${slug}"`);
    return toBrandDto(row);
  }

  update(id: string, expected: number, input: UpdateBrandDto): Promise<BrandDto> {
    return this.db.transaction(async (tx) => {
      if (input.slug !== undefined) {
        const current = await this.findLive(tx, id);
        if (!current) throw new NotFoundException(`Brand ${id} does not exist`);
        // If the row changes meanwhile, the versioned update below answers 412 and
        // the former slug recorded here is rolled back with it.
        await changeSlug(tx, 'brand', id, current.slug, input.slug);
      }
      const row = await conflictOnUnique(
        () =>
          updateVersioned(tx, brand, 'Brand', id, expected, {
            name: input.name,
            slug: input.slug,
          }),
        taken(input.slug ?? ''),
      );
      return toBrandDto(row);
    });
  }

  /** Soft delete; refused while live products use the brand (FR-030). */
  remove(id: string, expected: number): Promise<void> {
    return this.db.transaction(async (tx) => {
      // The update locks the row first: a product being created for this brand either
      // committed already (and is counted) or waits and then sees the brand deleted.
      await updateVersioned(tx, brand, 'Brand', id, expected, { deletedAt: sql`now()` });
      const [used] = await tx
        .select({ n: count() })
        .from(product)
        .where(and(eq(product.brandId, id), isNull(product.deletedAt)));
      if (used && used.n > 0) {
        throw new ConflictException(
          `${String(used.n)} product${used.n === 1 ? ' uses' : 's use'} this brand`,
        );
      }
    });
  }

  /** Brings a deleted brand back, if its slug is still free (FR-030). */
  restore(id: string, expected: number): Promise<BrandDto> {
    return this.db.transaction(async (tx) => {
      const row = await conflictOnUnique(
        () =>
          updateVersioned(
            tx,
            brand,
            'Brand',
            id,
            expected,
            { deletedAt: null, deletedBy: null },
            'deleted',
          ),
        'Another brand has taken its slug meanwhile; restore it after changing that one',
      );
      await assertSlugFree(tx, 'brand', row.slug, id);
      return toBrandDto(row);
    });
  }

  private async findLive(db: Executor, id: string): Promise<BrandRow | undefined> {
    const [row] = await db
      .select()
      .from(brand)
      .where(and(live, eq(brand.id, id)));
    return row;
  }
}
