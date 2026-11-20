import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/db/database.js';
import { migrateDatabase } from '../src/db/migrate.js';
import { SEED_CATEGORIES } from '../src/db/seed.js';
import {
  APP_PASSWORD,
  type CatalogDatabase,
  startCatalogDatabase,
} from './support/catalog-database.js';

/** The error code PostgreSQL gives `sql`, or `null` if it succeeds. */
async function errorCode(client: pg.Client, sql: string): Promise<string | null> {
  await client.query('SAVEPOINT attempt');
  try {
    await client.query(sql);
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? 'unknown';
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT attempt');
  }
}

describe('the catalog schema', () => {
  let db: CatalogDatabase;
  let owner: pg.Client;

  beforeAll(async () => {
    db = await startCatalogDatabase();
    owner = new pg.Client({ connectionString: db.ownerUrl });
    await owner.connect();
  });

  afterAll(async () => {
    await owner?.end();
    await db?.container.stop();
  });

  describe('uuid_v7() (FR-035)', () => {
    it('makes version 7 ids that grow with time', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const { rows } = await owner.query<{ id: string }>(
          'SELECT uuid_v7() AS id FROM pg_sleep(0.002)',
        );
        ids.push(rows[0]!.id);
      }
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab]/);
      expect([...ids].sort()).toEqual(ids);
    });

    it('is the default id of new rows', async () => {
      const { rows } = await owner.query<{ id: string }>(
        "INSERT INTO brand (name, slug) VALUES ('Default id', 'default-id') RETURNING id",
      );
      expect(rows[0]!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    });
  });

  // AC #4: a row the API would reject cannot be stored, even by hand.
  describe('what the database refuses by itself (FR-040)', () => {
    let brandId: string;
    let categoryId: string;

    beforeAll(async () => {
      await owner.query('BEGIN');
      brandId = (
        await owner.query<{ id: string }>(
          "INSERT INTO brand (name, slug) VALUES ('ASUS', 'asus') RETURNING id",
        )
      ).rows[0]!.id;
      categoryId = (
        await owner.query<{ id: string }>(
          "INSERT INTO category (name, slug) VALUES ('Graphics', 'graphics') RETURNING id",
        )
      ).rows[0]!.id;
      await owner.query(`INSERT INTO product (name, slug, sku, brand_id, category_id, price_cents)
        VALUES ('RTX 4060', 'rtx-4060', 'ASUS-4060', '${brandId}', '${categoryId}', 32999)`);
    });

    afterAll(() => owner.query('ROLLBACK'));

    /** An insert of a valid product, with some columns replaced. */
    const product = (fields: Record<string, string> = {}) => {
      const all: Record<string, string> = {
        name: "'X'",
        slug: "'x'",
        sku: "'X-1'",
        brand_id: `'${brandId}'`,
        category_id: `'${categoryId}'`,
        price_cents: '100',
        ...fields,
      };
      return `INSERT INTO product (${Object.keys(all).join(', ')}) VALUES (${Object.values(all).join(', ')})`;
    };
    const attribute = (fields: Record<string, string>) => {
      const all: Record<string, string> = {
        category_id: `'${categoryId}'`,
        code: "'memory_size'",
        name: "'Memory size'",
        type: "'number'",
        required: 'true',
        ...fields,
      };
      return `INSERT INTO category_attribute (${Object.keys(all).join(', ')}) VALUES (${Object.values(all).join(', ')})`;
    };

    it('accepts a valid product and a valid attribute of each type', async () => {
      expect(await errorCode(owner, product())).toBeNull();
      const valid: Record<string, string>[] = [
        { type: "'number'", unit: "'GB'", min_value: '1', max_value: '64', whole_numbers: 'true' },
        { code: "'socket'", type: "'select'", allowed_values: "ARRAY['AM5']" },
        { code: "'ports'", type: "'multi_select'", allowed_values: "ARRAY['HDMI', 'DP']" },
        { code: "'rt'", type: "'boolean'" },
        { code: "'chip'", type: "'text'", max_length: '50' },
      ];
      for (const fields of valid) {
        expect(await errorCode(owner, attribute(fields)), JSON.stringify(fields)).toBeNull();
      }
    });

    it.each([
      ['an empty name', 'name', "''"],
      ['a name with outer spaces', 'name', "' RTX '"],
      ['a name of 201 characters', 'name', "repeat('a', 201)"],
      ['a slug with capitals', 'slug', "'RTX-4060'"],
      ['a slug with a double dash', 'slug', "'rtx--4060'"],
      ['a slug of 101 characters', 'slug', "repeat('a', 101)"],
      ['a lowercase SKU', 'sku', "'asus-4060'"],
      ['a zero price', 'price_cents', '0'],
      ['a negative price', 'price_cents', '-1'],
      ['a negative stock', 'stock', '-1'],
      ['specs that are not an object', 'specs', `'[1, 2]'::jsonb`],
      ['a description of 10 001 characters', 'description', "repeat('a', 10001)"],
      ['version 0', 'version', '0'],
      ['deleted_by without deleted_at', 'deleted_by', 'uuid_v7()'],
    ])('refuses a product with %s', async (_what, column, value) => {
      expect(await errorCode(owner, product({ [column]: value }))).toBe('23514'); // check_violation
    });

    it.each([
      ['an unknown type', { type: "'colour'" }],
      ['a list type without values', { type: "'select'" }],
      ['a list type with an empty list', { type: "'select'", allowed_values: 'ARRAY[]::text[]' }],
      ['values on a number', { allowed_values: "ARRAY['8']" }],
      ['a unit on a boolean', { type: "'boolean'", unit: "'GB'" }],
      ['a range on a text', { type: "'text'", max_length: '10', min_value: '1' }],
      ['min above max', { min_value: '10', max_value: '1' }],
      ['a text without a maximum length', { type: "'text'" }],
      ['a maximum length on a number', { max_length: '10' }],
      ['a code with capitals', { code: "'MemorySize'" }],
    ])('refuses an attribute with %s', async (_what, fields) => {
      expect(await errorCode(owner, attribute(fields))).toBe('23514');
    });

    it('refuses a category that is its own parent', async () => {
      expect(
        await errorCode(owner, `UPDATE category SET parent_id = id WHERE id = '${categoryId}'`),
      ).toBe('23514');
    });

    it('refuses a second live product with the same slug or SKU, but not after a delete', async () => {
      expect(await errorCode(owner, product({ slug: "'rtx-4060'" }))).toBe('23505');
      expect(await errorCode(owner, product({ sku: "'ASUS-4060'" }))).toBe('23505');
      await owner.query("UPDATE product SET deleted_at = now() WHERE sku = 'ASUS-4060'");
      expect(await errorCode(owner, product({ sku: "'ASUS-4060'" }))).toBeNull();
    });

    it('refuses references to rows that do not exist', async () => {
      expect(await errorCode(owner, product({ brand_id: 'uuid_v7()' }))).toBe('23503');
      expect(await errorCode(owner, product({ category_id: 'uuid_v7()' }))).toBe('23503');
    });

    it('refuses a former slug taken twice for one kind', async () => {
      await owner.query(
        `INSERT INTO former_slug (kind, slug, entity_id) VALUES ('product', 'old-name', uuid_v7())`,
      );
      expect(
        await errorCode(
          owner,
          `INSERT INTO former_slug (kind, slug, entity_id) VALUES ('product', 'old-name', uuid_v7())`,
        ),
      ).toBe('23505');
      expect(
        await errorCode(
          owner,
          `INSERT INTO former_slug (kind, slug, entity_id) VALUES ('order', 'x', uuid_v7())`,
        ),
      ).toBe('23514');
    });
  });
});

// FR-041, FR-042, AC #3: the database of TASK-2, with its rows, upgraded in place.
describe('upgrading the TASK-2 database', () => {
  let container: StartedPostgreSqlContainer;
  let pool: pg.Pool;
  let folder: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17.11-alpine').start();
    pool = new pg.Pool({ connectionString: container.getConnectionUri() });
    // The migrations as TASK-2 shipped them: only the first one.
    folder = mkdtempSync(join(tmpdir(), 'catalog-task2-'));
    cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
    const journalFile = join(folder, 'meta', '_journal.json');
    const journal = JSON.parse(readFileSync(journalFile, 'utf8')) as { entries: unknown[] };
    journal.entries = journal.entries.slice(0, 1);
    writeFileSync(journalFile, JSON.stringify(journal));
    await migrate(drizzle(pool), { migrationsFolder: folder });
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
    if (folder) rmSync(folder, { recursive: true, force: true });
  });

  it('keeps the rows, their ids and creation times, and gives them the new columns', async () => {
    // What a TASK-2 database holds: the seed, plus a row someone added.
    await pool.query(
      `INSERT INTO category (name, slug, sort_order, created_at)
       SELECT name, slug, sort_order, '2026-11-10T10:00:00Z'
       FROM jsonb_to_recordset($1::jsonb) AS t(name text, slug text, sort_order int)`,
      [JSON.stringify(SEED_CATEGORIES.map((c) => ({ ...c, sort_order: c.sortOrder })))],
    );
    await pool.query(
      "INSERT INTO category (name, slug, sort_order) VALUES ('Monitors', 'monitors', 70)",
    );
    const before = (
      await pool.query<{ id: string; slug: string }>('SELECT id, slug FROM category ORDER BY slug')
    ).rows;

    await migrateDatabase(container.getConnectionUri(), APP_PASSWORD);

    const after = await pool.query<{
      id: string;
      slug: string;
      parent_id: string | null;
      version: number;
      deleted_at: Date | null;
      same_times: boolean;
    }>(
      `SELECT id, slug, parent_id, version, deleted_at, updated_at = created_at AS same_times
       FROM category ORDER BY slug`,
    );
    expect(after.rows.map(({ id, slug }) => ({ id, slug }))).toEqual(before);
    for (const row of after.rows) {
      expect(row).toMatchObject({
        parent_id: null,
        version: 1,
        deleted_at: null,
        same_times: true,
      });
    }
  });
});
