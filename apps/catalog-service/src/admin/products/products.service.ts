import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProductDto,
  ProductDto,
  ProductListQueryDto,
  UpdateProductDto,
} from '@master-commerce/dto';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { DB, type Database } from '../../db/database.js';
import { brand, product, type ProductRow } from '../../db/schema.js';
import { attributesOf, liveChildCount, lockLivePath, toRule } from '../categories/tree.js';
import { conflictOnUnique, type Executor } from '../common/executor.js';
import { type Page, pageWindow, toPage } from '../common/paging.js';
import { assertSlugFree, changeSlug, entityOfFormerSlug } from '../common/slugs.js';
import { updateVersioned } from '../common/versioning.js';
import { validateSpecs } from '../specs.js';

const live = isNull(product.deletedAt);

/** Which of the two unique values another live product has. */
const taken =
  (slug: string | undefined, sku: string | undefined) => (constraint: string | undefined) =>
    constraint === 'product_sku_live'
      ? `A product with the SKU "${sku ?? ''}" already exists`
      : `A product with the slug "${slug ?? ''}" already exists`;

export function toProductDto(row: ProductRow): ProductDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    brandId: row.brandId,
    categoryId: row.categoryId,
    priceCents: row.priceCents,
    stock: row.stock,
    specs: row.specs,
    published: row.published,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

/** Where a product goes and what it says about itself. */
interface Placement {
  brandId: string;
  categoryId: string;
  specs: Record<string, unknown>;
}

/**
 * How a missing brand or category is answered: `404` when the request names it, `409`
 * when a restore finds the product's own one deleted.
 */
type Missing = (what: string) => HttpException;
const notFound: Missing = (what) => new NotFoundException(`${what} does not exist`);
const deletedSince: Missing = (what) =>
  new ConflictException(`${what} is deleted; restore it first`);

/** Products of the admin API (FR-020…FR-025). */
@Injectable()
export class ProductsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** A new product, unpublished until it is published (US-2). */
  create(input: CreateProductDto): Promise<ProductDto> {
    return this.db.transaction(async (tx) => {
      await this.checkPlacement(tx, input, notFound);
      await assertSlugFree(tx, 'product', input.slug);
      const [row] = await conflictOnUnique(
        () =>
          tx
            .insert(product)
            .values({
              name: input.name,
              slug: input.slug,
              sku: input.sku,
              description: input.description ?? '',
              brandId: input.brandId,
              categoryId: input.categoryId,
              priceCents: input.priceCents,
              stock: input.stock ?? 0,
              specs: input.specs,
            })
            .returning(),
        taken(input.slug, input.sku),
      );
      return toProductDto(row!);
    });
  }

  /** Live products, filtered, a page at a time in creation order (FR-024, FR-034). */
  async list(query: ProductListQueryDto): Promise<Page<ProductDto>> {
    const window = pageWindow(product.id, query.limit, query.cursor);
    const rows = await this.db
      .select()
      .from(product)
      .where(
        and(
          live,
          query.categoryId ? eq(product.categoryId, query.categoryId) : undefined,
          query.brandId ? eq(product.brandId, query.brandId) : undefined,
          query.published === undefined ? undefined : eq(product.published, query.published),
          window.after,
        ),
      )
      .orderBy(asc(product.id))
      .limit(window.fetch);
    const page = toPage(rows, window.size);
    return { items: page.items.map(toProductDto), nextCursor: page.nextCursor };
  }

  async get(id: string): Promise<ProductDto> {
    const row = await this.findLive(this.db, id);
    if (!row) throw new NotFoundException(`Product ${id} does not exist`);
    return toProductDto(row);
  }

  /** By the current slug, else by a former one; the body has the current slug (FR-025). */
  async getBySlug(slug: string): Promise<ProductDto> {
    const [current] = await this.db
      .select()
      .from(product)
      .where(and(live, eq(product.slug, slug)));
    if (current) return toProductDto(current);
    const formerOwner = await entityOfFormerSlug(this.db, 'product', slug);
    const row = formerOwner ? await this.findLive(this.db, formerOwner) : undefined;
    if (!row) throw new NotFoundException(`No product has the slug "${slug}"`);
    return toProductDto(row);
  }

  /** Any of the create fields; a new category, brand or specs are checked again (FR-023). */
  update(id: string, expected: number, input: UpdateProductDto): Promise<ProductDto> {
    return this.db.transaction(async (tx) => {
      const placing =
        input.brandId !== undefined || input.categoryId !== undefined || input.specs !== undefined;
      if (placing || input.slug !== undefined) {
        const current = await this.findLive(tx, id);
        if (!current) throw new NotFoundException(`Product ${id} does not exist`);
        // If the row changes meanwhile, the versioned update answers 412 and all of
        // this is rolled back with it.
        if (placing) {
          await this.checkPlacement(
            tx,
            {
              brandId: input.brandId ?? current.brandId,
              categoryId: input.categoryId ?? current.categoryId,
              specs: input.specs ?? current.specs,
            },
            notFound,
          );
        }
        if (input.slug !== undefined) {
          await changeSlug(tx, 'product', id, current.slug, input.slug);
        }
      }
      const row = await conflictOnUnique(
        () =>
          updateVersioned(tx, product, 'Product', id, expected, {
            name: input.name,
            slug: input.slug,
            sku: input.sku,
            description: input.description,
            brandId: input.brandId,
            categoryId: input.categoryId,
            priceCents: input.priceCents,
            stock: input.stock,
            specs: input.specs,
          }),
        taken(input.slug, input.sku),
      );
      return toProductDto(row);
    });
  }

  /** Shown on the storefront or not (FR-024). */
  async setPublished(id: string, expected: number, published: boolean): Promise<ProductDto> {
    return toProductDto(
      await updateVersioned(this.db, product, 'Product', id, expected, { published }),
    );
  }

  /** Soft delete; orders and links keep the row (FR-030). */
  async remove(id: string, expected: number): Promise<void> {
    await updateVersioned(this.db, product, 'Product', id, expected, { deletedAt: sql`now()` });
  }

  /**
   * Brings a deleted product back: its slug and SKU still free, its brand and category
   * live, its specs still valid for the category's current attributes.
   */
  restore(id: string, expected: number): Promise<ProductDto> {
    return this.db.transaction(async (tx) => {
      const row = await conflictOnUnique(
        () =>
          updateVersioned(
            tx,
            product,
            'Product',
            id,
            expected,
            { deletedAt: null, deletedBy: null },
            'deleted',
          ),
        (constraint) =>
          `Another product has taken its ${constraint === 'product_sku_live' ? 'SKU' : 'slug'} ` +
          'meanwhile; restore it after changing that one',
      );
      await this.checkPlacement(tx, row, deletedSince, true);
      await assertSlugFree(tx, 'product', row.slug, id);
      return toProductDto(row);
    });
  }

  /**
   * The brand and the whole category path live and locked, the category a leaf, the
   * specs valid for its effective attributes (FR-010, FR-023, research R-5, R-8).
   */
  private async checkPlacement(
    tx: Executor,
    { brandId, categoryId, specs }: Placement,
    missing: Missing,
    restoring = false,
  ): Promise<void> {
    const [liveBrand] = await tx
      .select({ id: brand.id })
      .from(brand)
      .where(and(eq(brand.id, brandId), isNull(brand.deletedAt)))
      .for('share');
    if (!liveBrand) throw missing(`Brand ${brandId}`);

    const path = await lockLivePath(tx, categoryId);
    if (!path) throw missing(`Category ${categoryId}`);
    const leaf = path.at(-1)!;
    if ((await liveChildCount(tx, categoryId)) > 0) {
      throw new ConflictException(
        `${leaf.name} has subcategories; products go into categories without them`,
      );
    }

    const attributes = await attributesOf(
      tx,
      path.map((c) => c.id),
    );
    const rules = path.flatMap((c) => (attributes.get(c.id) ?? []).map(toRule));
    const errors = validateSpecs(rules, specs, leaf.name);
    if (errors.length === 0) return;
    if (restoring) {
      throw new ConflictException(
        `Its specs no longer fit the attributes of ${leaf.name}: ` +
          errors.map((e) => e.messages.join('; ')).join('; '),
      );
    }
    throw new BadRequestException({ message: 'The request is invalid', errors });
  }

  private async findLive(db: Executor, id: string): Promise<ProductRow | undefined> {
    const [row] = await db
      .select()
      .from(product)
      .where(and(live, eq(product.id, id)));
    return row;
  }
}
