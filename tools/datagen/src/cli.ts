import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { generate } from './generate.js';
import { DatagenError, output } from './load.js';

// pnpm datagen [--scale 1k|100k|1m|<n>] [--seed <text>] [--zipf <x>] [--reset]
//              [--out <dir>] [--no-load] [--database-url <url>]

const ROOT_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));
const SCALES: Record<string, number> = { '1k': 1_000, '100k': 100_000, '1m': 1_000_000 };

const USAGE = `Fills the catalog database with a generated hardware catalog.

  --scale <1k|100k|1m|n>  products (default 1k)
  --seed <text>           the same seed gives the same catalog (default demo)
  --zipf <x>              skew of products per brand (default 1.1)
  --reset                 replace a catalog that holds brands or products
  --out <dir>             also write one CSV file per table
  --no-load               do not touch the database (hash, and files with --out)
  --database-url <url>    default: CATALOG_MIGRATION_URL from .env (the owner role)`;

export function parseScale(text: string): number {
  const n = SCALES[text.toLowerCase()] ?? Number(text);
  if (!Number.isInteger(n) || n < 1) {
    throw new DatagenError(
      `--scale must be 1k, 100k, 1m or a whole number of 1 or more, not "${text}"`,
    );
  }
  return n;
}

/** Host, port and database of a URL, never its password. */
export function describeUrl(url: string): string {
  const u = new URL(url);
  return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
}

/** The lines printed after a run (spec FR-015). */
export function summary(run: {
  seed: string;
  products: number;
  zipf: number;
  counts: Record<string, number>;
  hash: string;
  target: string;
  seconds: number;
  peakMemoryMb: number;
}): string {
  const counts = Object.entries(run.counts)
    .map(([table, n]) => `${table} ${n}`)
    .join(', ');
  return [
    `datagen: seed "${run.seed}", ${run.products} products, Zipf ${run.zipf}`,
    `  rows: ${counts}`,
    `  hash: ${run.hash}`,
    `  ${run.target}; ${run.seconds.toFixed(1)} s; peak memory ${run.peakMemoryMb} MB`,
  ].join('\n');
}

/** The command: parse, generate, output, print the summary. */
export async function runCli(): Promise<void> {
  const { values } = parseArgs({
    options: {
      scale: { type: 'string', default: '1k' },
      seed: { type: 'string', default: 'demo' },
      zipf: { type: 'string', default: '1.1' },
      reset: { type: 'boolean', default: false },
      out: { type: 'string' },
      'no-load': { type: 'boolean', default: false },
      'database-url': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const products = parseScale(values.scale);
  const zipf = Number(values.zipf);
  if (!(zipf > 0)) throw new DatagenError(`--zipf must be a number above 0, not "${values.zipf}"`);

  if (existsSync(ROOT_ENV_FILE)) process.loadEnvFile(ROOT_ENV_FILE);
  const databaseUrl = values['no-load']
    ? undefined
    : (values['database-url'] ?? process.env.CATALOG_MIGRATION_URL);
  if (!values['no-load'] && !databaseUrl) {
    throw new DatagenError(
      'no database: set CATALOG_MIGRATION_URL in .env, pass --database-url or --no-load',
    );
  }

  const started = performance.now();
  const result = await output(generate({ seed: values.seed, products, zipf }), {
    databaseUrl,
    reset: values.reset,
    outDir: values.out,
  });
  const target = [
    databaseUrl ? `loaded into ${describeUrl(databaseUrl)}` : 'not loaded',
    values.out ? `CSV in ${values.out}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  console.log(
    summary({
      seed: values.seed,
      products,
      zipf,
      ...result,
      target,
      seconds: (performance.now() - started) / 1000,
      // maxRSS is in kilobytes.
      peakMemoryMb: Math.round(process.resourceUsage().maxRSS / 1024),
    }),
  );
}

/** How the entry point reports a failure: an expected one by its message only. */
export function failureMessage(error: unknown): unknown {
  const code = (error as { code?: unknown }).code;
  const expected =
    error instanceof DatagenError ||
    (typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS'));
  return expected ? `datagen: ${(error as Error).message}` : error;
}
