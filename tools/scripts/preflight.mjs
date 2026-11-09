// Runs before `pnpm dev` (FR-041, FR-042):
// 1. creates `.env` from `.env.example` if it is missing;
// 2. fails with a clear message when a port the stack needs is taken by another process.
//    On Windows Docker can publish a port that a native service already listens on, and
//    connections then reach the wrong server, so the check is done here, not left to Docker.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const envFile = join(root, '.env');

if (!existsSync(envFile)) {
  copyFileSync(join(root, '.env.example'), envFile);
  console.log('Created .env from .env.example; edit it to change ports or credentials.');
}
process.loadEnvFile(envFile);

/** Ports published by running containers of this Compose project are ours, not a conflict. */
function ownPorts() {
  try {
    const out = execFileSync('docker', ['compose', 'ps', '--format', 'json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const lines = out.trim().startsWith('[')
      ? JSON.parse(out)
      : out
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l));
    return new Set(lines.flatMap((c) => (c.Publishers ?? []).map((p) => p.PublishedPort)));
  } catch {
    return new Set();
  }
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.setTimeout(500);
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
    socket.once('error', () => resolve(false));
  });
}

const ports = Object.entries(process.env)
  .filter(([name]) => name.endsWith('_PORT'))
  .map(([name, value]) => [name, Number(value)]);
const ours = ownPorts();

const busy = [];
for (const [name, port] of ports) {
  if (!ours.has(port) && (await isListening(port))) busy.push(`${name}=${port}`);
}

if (busy.length > 0) {
  console.error(
    `Port(s) already in use by another process: ${busy.join(', ')}.\n` +
      'Stop that process, or change the port in .env (and the matching *_URL values).',
  );
  process.exit(1);
}
