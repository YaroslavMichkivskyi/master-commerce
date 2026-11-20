import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { once } from 'node:events';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { csvLine } from './csv.js';
import { createDataHash, type Table } from './generate.js';

/** An expected stop (not migrated, not empty): the CLI prints only the message. */
export class DatagenError extends Error {
  override name = 'DatagenError';
}

export interface OutputOptions {
  /** Load into this database as its owner (spec FR-010); none → only hash and files. */
  databaseUrl?: string;
  /** Replace a catalog that holds brands or products (spec FR-011). */
  reset?: boolean;
  /** Also write one CSV file per table here (spec FR-014). */
  outDir?: string;
}

export interface OutputResult {
  /** Rows per table, in load order. */
  counts: Record<string, number>;
  /** SHA-256 of the data, the same loaded or not (spec FR-001). */
  hash: string;
}

// Tables a load replaces; children first is irrelevant for TRUNCATE of the whole set.
const CATALOG_TABLES = ['product', 'category_attribute', 'former_slug', 'brand', 'category'];

/**
 * Hashes the tables and, as asked, writes them to CSV files and loads them, all from one
 * pass over the rows (plan D-1, D-8). A load is one transaction (spec FR-012): checks,
 * the catalog emptied, `COPY` of each table, `ANALYZE`, commit — or nothing at all.
 */
export async function output(
  tables: readonly Table[],
  options: OutputOptions,
): Promise<OutputResult> {
  const hash = createDataHash();
  const counts: Record<string, number> = {};
  if (options.outDir) mkdirSync(options.outDir, { recursive: true });

  /** The lines of one table, counted, hashed and written to its file on the way. */
  async function* lines(table: Table): AsyncGenerator<string> {
    let file: WriteStream | undefined;
    if (options.outDir) {
      file = createWriteStream(join(options.outDir, `${table.name}.csv`), { encoding: 'utf8' });
    }
    counts[table.name] = 0;
    try {
      for (const row of table.rows()) {
        const line = csvLine(row);
        hash.add(table.name, table.columns, line);
        counts[table.name]!++;
        if (file && !file.write(line)) await once(file, 'drain');
        yield line;
      }
    } finally {
      if (file) {
        file.end();
        await once(file, 'finish');
      }
    }
  }

  if (!options.databaseUrl) {
    for (const table of tables) {
      const all = lines(table);
      while (!(await all.next()).done); // nothing to load: the pass hashes and writes
    }
    return { counts, hash: hash.digest() };
  }

  const client = new pg.Client({ connectionString: options.databaseUrl });
  try {
    await client.connect();
  } catch (error) {
    throw new DatagenError(`cannot reach the catalog database: ${(error as Error).message}`);
  }
  try {
    await checkMigrated(client);
    await client.query('BEGIN');
    // No reads or writes of the catalog until this load commits or rolls back.
    await client.query(`LOCK TABLE ${CATALOG_TABLES.join(', ')} IN ACCESS EXCLUSIVE MODE`);
    if (!options.reset) await checkEmpty(client);
    await client.query(`TRUNCATE ${CATALOG_TABLES.join(', ')}`);
    for (const table of tables) {
      const copy = client.query(
        copyFrom(`COPY ${table.name} (${table.columns.join(', ')}) FROM STDIN WITH (FORMAT csv)`),
      );
      await pipeline(Readable.from(lines(table)), copy);
    }
    await client.query(`ANALYZE ${tables.map((t) => t.name).join(', ')}`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
  return { counts, hash: hash.digest() };
}

async function checkMigrated(client: pg.Client): Promise<void> {
  const { rows } = await client.query<{ missing: string | null }>(
    `SELECT string_agg(t, ', ') AS missing FROM unnest($1::text[]) AS t
     WHERE to_regclass('public.' || t) IS NULL`,
    [CATALOG_TABLES],
  );
  if (rows[0]?.missing) {
    throw new DatagenError(
      `the catalog schema is not migrated (missing: ${rows[0].missing}); ` +
        'run pnpm --filter catalog-service db:migrate first',
    );
  }
}

/** Brands or products, live or deleted, mean someone's catalog: refuse it (spec FR-011). */
async function checkEmpty(client: pg.Client): Promise<void> {
  const { rows } = await client.query<{ brands: number; products: number }>(
    'SELECT (SELECT count(*) FROM brand)::int AS brands, (SELECT count(*) FROM product)::int AS products',
  );
  const { brands, products } = rows[0]!;
  if (brands > 0 || products > 0) {
    throw new DatagenError(
      `the catalog holds ${brands} brands and ${products} products; nothing was changed. ` +
        'Run again with --reset to replace the whole catalog',
    );
  }
}
