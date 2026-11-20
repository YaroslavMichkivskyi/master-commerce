import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AttributeDto,
  CategoryDetailDto,
  CategoryTreeDto,
  CategoryTreeNodeDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@master-commerce/dto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DB, type Database } from '../../db/database.js';
import { category, categoryAttribute, type CategoryRow } from '../../db/schema.js';
import { conflictOnUnique, type Executor } from '../common/executor.js';
import { assertSlugFree, changeSlug, entityOfFormerSlug } from '../common/slugs.js';
import { updateVersioned } from '../common/versioning.js';
import { attributeSetErrors, columnsOf, ruleOf } from './attributes.js';
import { checkSubtree } from './subtree.js';
import {
  attributesOf,
  liveCategory,
  liveChildCount,
  liveProductCount,
  lockLiveCategory,
  lockTreeShape,
  pathTo,
  toAttributeDto,
} from './tree.js';

/** Whether any stored column differs; arrays compared by their values. */
function changed(old: Record<string, unknown>, columns: Record<string, unknown>): boolean {
  return Object.entries(columns).some(
    ([key, value]) => JSON.stringify(old[key]) !== JSON.stringify(value),
  );
}

const taken = (slug: string) => `A category with the slug "${slug}" already exists`;
const plural = (n: number, one: string, many: string) => `${String(n)} ${n === 1 ? one : many}`;

function audited(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sortOrder,
    parentId: row.parentId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

/** Categories of the admin API: a tree whose leaves hold the products (FR-010…FR-015). */
@Injectable()
export class AdminCategoriesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Every live category with its own attributes, nested, each level in display order. */
  async tree(): Promise<CategoryTreeDto> {
    const rows = await this.db
      .select()
      .from(category)
      .where(liveCategory)
      .orderBy(asc(category.sortOrder), asc(category.name));
    const attributes = await attributesOf(
      this.db,
      rows.map((r) => r.id),
    );
    const nodes = new Map<string, CategoryTreeNodeDto>(
      rows.map((row) => [
        row.id,
        {
          ...audited(row),
          attributes: (attributes.get(row.id) ?? []).map(toAttributeDto),
          children: [],
        },
      ]),
    );
    const items: CategoryTreeNodeDto[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
      (parent ? parent.children : items).push(node);
    }
    return { items };
  }

  async get(id: string): Promise<CategoryDetailDto> {
    const row = await this.findLive(this.db, id);
    if (!row) throw new NotFoundException(`Category ${id} does not exist`);
    return this.detail(this.db, row);
  }

  /** By the current slug, else by a former one; the body has the current slug (FR-025). */
  async getBySlug(slug: string): Promise<CategoryDetailDto> {
    const [current] = await this.db
      .select()
      .from(category)
      .where(and(liveCategory, eq(category.slug, slug)));
    if (current) return this.detail(this.db, current);
    const formerOwner = await entityOfFormerSlug(this.db, 'category', slug);
    const row = formerOwner ? await this.findLive(this.db, formerOwner) : undefined;
    if (!row) throw new NotFoundException(`No category has the slug "${slug}"`);
    return this.detail(this.db, row);
  }

  create(input: CreateCategoryDto): Promise<CategoryDetailDto> {
    return this.db.transaction(async (tx) => {
      if (input.parentId) await this.lockParent(tx, input.parentId);
      await assertSlugFree(tx, 'category', input.slug);
      const [row] = await conflictOnUnique(
        () =>
          tx
            .insert(category)
            .values({
              name: input.name,
              slug: input.slug,
              sortOrder: input.sortOrder ?? 0,
              parentId: input.parentId ?? null,
            })
            .returning(),
        taken(input.slug),
      );
      return this.detail(tx, row!);
    });
  }

  /** A change of name, slug, order, or a move under another parent (FR-010, FR-012). */
  update(id: string, expected: number, input: UpdateCategoryDto): Promise<CategoryDetailDto> {
    return this.db.transaction(async (tx) => {
      const moving = input.parentId !== undefined;
      if (moving) await lockTreeShape(tx);
      if (moving || input.slug !== undefined) {
        // Locked when moving: a product written under it waits for the checks below.
        const current = moving
          ? await lockLiveCategory(tx, id, 'update')
          : await this.findLive(tx, id);
        if (!current) throw new NotFoundException(`Category ${id} does not exist`);
        if (moving && input.parentId !== current.parentId) {
          const parentId = input.parentId ?? null;
          await this.checkMove(tx, id, parentId);
          // Its products against the attributes of the new ancestors (FR-013, FR-015).
          await checkSubtree(tx, id, parentId === null ? [] : await pathTo(tx, parentId));
        }
        // If the row changes meanwhile, the versioned update answers 412 and all of
        // this is rolled back with it.
        if (input.slug !== undefined) {
          await changeSlug(tx, 'category', id, current.slug, input.slug);
        }
      }
      const row = await conflictOnUnique(
        () =>
          updateVersioned(tx, category, 'Category', id, expected, {
            name: input.name,
            slug: input.slug,
            sortOrder: input.sortOrder,
            parentId: input.parentId,
          }),
        taken(input.slug ?? ''),
      );
      return this.detail(tx, row);
    });
  }

  /** Soft delete of a category with no live subcategories and no live products. */
  remove(id: string, expected: number): Promise<void> {
    return this.db.transaction(async (tx) => {
      // The update locks the row first: a child or a product being added under it
      // either committed already (and is counted) or waits and then finds it deleted.
      await updateVersioned(tx, category, 'Category', id, expected, { deletedAt: sql`now()` });
      const children = await liveChildCount(tx, id);
      if (children > 0) {
        throw new ConflictException(
          `The category has ${plural(children, 'subcategory', 'subcategories')}; ` +
            'move or delete them first',
        );
      }
      const products = await liveProductCount(tx, id);
      if (products > 0) {
        throw new ConflictException(
          `${plural(products, 'product is', 'products are')} in this category`,
        );
      }
    });
  }

  /** Brings a deleted category back under its live parent, if its slug is still free. */
  restore(id: string, expected: number): Promise<CategoryDetailDto> {
    return this.db.transaction(async (tx) => {
      const row = await conflictOnUnique(
        () =>
          updateVersioned(
            tx,
            category,
            'Category',
            id,
            expected,
            { deletedAt: null, deletedBy: null },
            'deleted',
          ),
        'Another category has taken its slug meanwhile; restore it after changing that one',
      );
      if (row.parentId !== null) {
        const parent = await lockLiveCategory(tx, row.parentId, 'update');
        if (!parent) {
          throw new ConflictException('Its parent category is deleted; restore that first');
        }
        await this.refuseProductsIn(tx, row.parentId, 'Its parent');
      }
      await assertSlugFree(tx, 'category', row.slug, id);
      // The ancestors' attributes may have changed while it was deleted.
      await checkSubtree(tx, id, (await pathTo(tx, id)).slice(0, -1));
      return this.detail(tx, row);
    });
  }

  /**
   * Replaces the category's own attributes as a set (FR-011, FR-013, research R-9): with
   * the category's version, which it bumps; refused when a code would repeat along a
   * path or a product of the subtree would become invalid.
   */
  replaceAttributes(
    id: string,
    expected: number,
    attributes: readonly AttributeDto[],
  ): Promise<CategoryDetailDto> {
    const errors = attributeSetErrors(attributes);
    if (errors.length > 0) {
      throw new BadRequestException({ message: 'The request is invalid', errors });
    }
    return this.db.transaction(async (tx) => {
      // Attributes and moves both change what the subtree's products must satisfy.
      await lockTreeShape(tx);
      const row = await updateVersioned(tx, category, 'Category', id, expected, {});
      await checkSubtree(tx, id, (await pathTo(tx, id)).slice(0, -1), attributes.map(ruleOf));

      // The rows of codes that stay are updated in place, so their ids and history stay;
      // the others are soft-deleted (the role has no DELETE) or added.
      const stored = (await attributesOf(tx, [id])).get(id) ?? [];
      const byCode = new Map(stored.map((a) => [a.code, a]));
      const kept = new Set(attributes.map((a) => a.code));
      for (const old of stored) {
        if (kept.has(old.code)) continue;
        await tx
          .update(categoryAttribute)
          .set({ deletedAt: sql`now()`, updatedAt: sql`now()`, version: sql`version + 1` })
          .where(eq(categoryAttribute.id, old.id));
      }
      for (const attribute of attributes) {
        const columns = columnsOf(attribute);
        const old = byCode.get(attribute.code);
        if (!old) {
          await tx.insert(categoryAttribute).values({ ...columns, categoryId: id });
        } else if (changed(old, columns)) {
          await tx
            .update(categoryAttribute)
            .set({ ...columns, updatedAt: sql`now()`, version: sql`version + 1` })
            .where(eq(categoryAttribute.id, old.id));
        }
      }
      return this.detail(tx, row);
    });
  }

  /** The parent of a new child: live (`404`) and holding no products (`409`). */
  private async lockParent(tx: Executor, parentId: string): Promise<void> {
    const parent = await lockLiveCategory(tx, parentId, 'update');
    if (!parent) throw new NotFoundException(`Parent category ${parentId} does not exist`);
    await this.refuseProductsIn(tx, parentId, 'The parent');
  }

  /** A move under `parentId` (null: to the top) must not make a cycle. */
  private async checkMove(tx: Executor, id: string, parentId: string | null): Promise<void> {
    if (parentId === null) return;
    await this.lockParent(tx, parentId);
    if ((await pathTo(tx, parentId)).includes(id)) {
      throw new ConflictException('A category cannot move under itself or its subcategories');
    }
  }

  /** Products live only in categories without children (FR-010). */
  private async refuseProductsIn(tx: Executor, categoryId: string, who: string): Promise<void> {
    const products = await liveProductCount(tx, categoryId);
    if (products > 0) {
      throw new ConflictException(
        `${who} category holds ${plural(products, 'product', 'products')}; ` +
          'products stay in categories without subcategories',
      );
    }
  }

  private async detail(db: Executor, row: CategoryRow): Promise<CategoryDetailDto> {
    const path = await pathTo(db, row.id);
    const attributes = await attributesOf(db, path);
    return {
      ...audited(row),
      attributes: (attributes.get(row.id) ?? []).map(toAttributeDto),
      inheritedAttributes: path
        .slice(0, -1)
        .flatMap((ancestor) => attributes.get(ancestor) ?? [])
        .map(toAttributeDto),
    };
  }

  private async findLive(db: Executor, id: string): Promise<CategoryRow | undefined> {
    const [row] = await db
      .select()
      .from(category)
      .where(and(liveCategory, eq(category.id, id)));
    return row;
  }
}
