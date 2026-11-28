// The visual, accessibility and budget tests (specs/036-web-design R-7, R-8). Everything
// runs in Docker (e2e/compose.yaml): Postgres, the generated catalog, catalog-service, the
// gateway, the shop, the tests. The host needs Docker only; nothing is published on it and
// nothing is left behind but e2e/ (reference screenshots, report, results).
//
//   pnpm --filter web test:visual [--update] [-- <playwright args>]
//   pnpm --filter web test:visual --serve     # the shops on 127.0.0.1:3300 / 3310, Ctrl+C
//
// Without pnpm or Node, the same by hand from apps/web/e2e:
//   docker compose run --rm --build tests [--update-snapshots]; docker compose down -v

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseVisualArgs } from './visual-args.mjs';

const E2E = fileURLToPath(new URL('../e2e/', import.meta.url));
const { update, serve, passThrough, ports } = parseVisualArgs(process.argv.slice(2), process.env);

const files = ['-f', 'compose.yaml', ...(serve ? ['-f', 'compose.serve.yaml'] : [])];
const compose = (...rest) =>
  spawnSync('docker', ['compose', ...files, ...rest], { cwd: E2E, stdio: 'inherit' }).status ?? 1;

/**
 * On Linux what the tests (root in the container) wrote into the bind-mounted e2e/ —
 * screenshots, the report — is given back to the caller, so it is theirs to change or
 * delete. Docker Desktop (Windows, macOS) maps owners itself.
 */
function giveBack() {
  if (process.platform !== 'linux') return;
  const owner = `${process.getuid()}:${process.getgid()}`;
  compose(
    'run',
    '--rm',
    '--no-deps',
    '--entrypoint',
    'chown',
    'tests',
    '-R',
    owner,
    '/repo/apps/web/e2e',
  );
}

let code = 1;
let built = false;
try {
  // A stack left by an interrupted run holds a filled database: start from nothing.
  compose('down', '--volumes', '--remove-orphans');
  code = compose('build', 'prepare');
  if (code !== 0) throw new Error('the image did not build');
  built = true;
  if (serve) {
    code = compose('up', '--wait', 'web', 'web-dead');
    if (code !== 0) throw new Error('the stack did not start');
    console.log(
      `\n[visual] Shop http://localhost:${ports.web}, dead shop http://localhost:${ports.dead}. Ctrl+C stops it.`,
    );
    await new Promise((resolve) => process.once('SIGINT', resolve));
  } else {
    code = compose(
      'run',
      '--rm',
      'tests',
      ...(update ? ['--update-snapshots'] : []),
      ...passThrough,
    );
  }
} catch (error) {
  console.error(`\n[visual] ${error instanceof Error ? error.message : error}`);
} finally {
  // Without the image there is nothing to give back, and compose would try to pull it.
  if (built) giveBack();
  // Containers, the network and the in-memory database go; the image stays as a cache.
  compose('down', '--volumes', '--remove-orphans');
}
process.exit(serve && code === 0 ? 0 : code);
