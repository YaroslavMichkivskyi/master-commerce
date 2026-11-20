import 'reflect-metadata';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { type CatalogDatabase, startCatalogDatabase } from './support/catalog-database.js';

// FR-043: the service's role reads, adds and changes rows; nothing else.
describe('the catalog_app role', () => {
  let db: CatalogDatabase;
  let app: pg.Client;

  beforeAll(async () => {
    db = await startCatalogDatabase();
    app = new pg.Client({ connectionString: db.appUrl });
    await app.connect();
  });

  afterAll(async () => {
    await app?.end();
    await db?.container.stop();
  });

  it('reads, adds and changes rows', async () => {
    await app.query("insert into category(name, slug) values ('Monitors', 'monitors')");
    await app.query("update category set sort_order = 70 where slug = 'monitors'");
    const { rows } = await app.query<{ n: string }>(
      "select count(*) as n from category where slug = 'monitors'",
    );
    expect(rows[0]?.n).toBe('1');
  });

  it('has the same rights on every table, also those added by later migrations', async () => {
    const { rows } = await app.query<{ table: string; rights: string }>(
      `SELECT tablename AS table,
              concat_ws(',',
                CASE WHEN has_table_privilege(tablename, 'SELECT') THEN 'select' END,
                CASE WHEN has_table_privilege(tablename, 'INSERT') THEN 'insert' END,
                CASE WHEN has_table_privilege(tablename, 'UPDATE') THEN 'update' END,
                CASE WHEN has_table_privilege(tablename, 'DELETE') THEN 'delete' END,
                CASE WHEN has_table_privilege(tablename, 'TRUNCATE') THEN 'truncate' END) AS rights
       FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    expect(rows.map((r) => r.table)).toEqual([
      'brand',
      'category',
      'category_attribute',
      'former_slug',
      'product',
    ]);
    for (const row of rows) expect(row.rights, row.table).toBe('select,insert,update');
  });

  it.each([
    ['delete rows', "delete from category where slug = 'cpus'"],
    ['empty a table', 'truncate category'],
    ['drop a table', 'drop table category'],
    ['create a table', 'create table stolen (x int)'],
    ['change a table', 'alter table category add column x int'],
    ['read password hashes', 'select rolpassword from pg_authid'],
    ['create a role', 'create role intruder'],
  ])('cannot %s', async (_what, sql) => {
    await expect(app.query(sql)).rejects.toThrow(/permission denied|must be owner/);
  });

  it('has a statement timeout and is not a superuser', async () => {
    const { rows } = await app.query<{ timeout: string; super: boolean }>(
      `select current_setting('statement_timeout') as timeout,
              (select rolsuper from pg_roles where rolname = current_user) as super`,
    );
    expect(rows[0]).toEqual({ timeout: '5s', super: false });
  });

  it('is the only role the service starts with: the owner is refused', async () => {
    process.env.CATALOG_DATABASE_URL = db.ownerUrl;
    await expect(createApp()).rejects.toThrow(
      'CATALOG_DATABASE_URL: connects as a superuser or the owner of the schema',
    );
  });
});
