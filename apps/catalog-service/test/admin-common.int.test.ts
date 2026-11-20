import { ConflictException, NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { changeSlug, entityOfFormerSlug } from '../src/admin/common/slugs.js';
import { updateVersioned } from '../src/admin/common/versioning.js';
import { type Database } from '../src/db/database.js';
import { brand } from '../src/db/schema.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

// The admin building blocks against PostgreSQL, as the service's own role (FR-043).
describe('admin building blocks', () => {
  let database: CatalogDatabase;
  let pool: pg.Pool;
  let db: Database;

  const newBrand = async (slug: string) =>
    (await db.insert(brand).values({ name: slug, slug }).returning())[0]!;

  beforeAll(async () => {
    database = await startCatalogDatabase();
    pool = new pg.Pool({ connectionString: database.appUrl });
    // The service's database type: no relational schema registered.
    db = drizzle<Record<string, never>>(pool);
  });

  afterAll(async () => {
    await pool?.end();
    await database?.container.stop();
  });

  describe('updateVersioned (FR-033)', () => {
    it('changes the row, bumps the version and the update time', async () => {
      const row = await newBrand('versioned');
      const updated = await updateVersioned(db, brand, 'Brand', row.id, 1, { name: 'Renamed' });
      expect(updated).toMatchObject({ name: 'Renamed', version: 2 });
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(row.updatedAt.getTime());
    });

    it('answers 412 for an older version and changes nothing', async () => {
      const row = await newBrand('stale');
      await updateVersioned(db, brand, 'Brand', row.id, 1, { name: 'First' });
      await expect(
        updateVersioned(db, brand, 'Brand', row.id, 1, { name: 'Second' }),
      ).rejects.toThrow(PreconditionFailedException);
      const [stored] = await db.select().from(brand).where(eq(brand.id, row.id));
      expect(stored).toMatchObject({ name: 'First', version: 2 });
    });

    it('lets only one of two concurrent changes of one version through', async () => {
      const row = await newBrand('race');
      const results = await Promise.allSettled([
        updateVersioned(db, brand, 'Brand', row.id, 1, { name: 'A' }),
        updateVersioned(db, brand, 'Brand', row.id, 1, { name: 'B' }),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected');
      expect(rejected?.reason).toBeInstanceOf(PreconditionFailedException);
    });

    it('answers 404 for a row that is not there, or not in the state asked for', async () => {
      const row = await newBrand('gone');
      await expect(
        updateVersioned(db, brand, 'Brand', '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60', 1, {}),
      ).rejects.toThrow(NotFoundException);
      await updateVersioned(db, brand, 'Brand', row.id, 1, { deletedAt: new Date() });
      await expect(updateVersioned(db, brand, 'Brand', row.id, 2, {})).rejects.toThrow(
        NotFoundException,
      );
      const restored = await updateVersioned(
        db,
        brand,
        'Brand',
        row.id,
        2,
        { deletedAt: null },
        'deleted',
      );
      expect(restored).toMatchObject({ deletedAt: null, version: 3 });
    });
  });

  describe('former slugs (FR-025)', () => {
    it('keeps the old slug for the entity and refuses it to another one', async () => {
      const a = await newBrand('old-name');
      await db.transaction((tx) => changeSlug(tx, 'brand', a.id, 'old-name', 'new-name'));
      expect(await entityOfFormerSlug(db, 'brand', 'old-name')).toBe(a.id);

      const b = await newBrand('other');
      await expect(
        db.transaction((tx) => changeSlug(tx, 'brand', b.id, 'other', 'old-name')),
      ).rejects.toThrow(ConflictException);
    });

    it('lets an entity take its own former slug back, more than once', async () => {
      const a = await newBrand('first');
      await db.transaction((tx) => changeSlug(tx, 'brand', a.id, 'first', 'second'));
      await db.transaction((tx) => changeSlug(tx, 'brand', a.id, 'second', 'first'));
      await db.transaction((tx) => changeSlug(tx, 'brand', a.id, 'first', 'second'));
      expect(await entityOfFormerSlug(db, 'brand', 'first')).toBe(a.id);
      expect(await entityOfFormerSlug(db, 'brand', 'second')).toBe(a.id);
    });

    it('keeps kinds apart', async () => {
      const a = await newBrand('shared');
      await db.transaction((tx) => changeSlug(tx, 'brand', a.id, 'shared', 'shared-brand'));
      expect(await entityOfFormerSlug(db, 'product', 'shared')).toBeUndefined();
    });
  });
});
