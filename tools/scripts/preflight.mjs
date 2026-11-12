// Runs before `pnpm dev` (FR-041, FR-042):
// 1. creates `.env` from `.env.example` if it is missing;
// 2. fails with a clear message when a port the stack needs is taken by another process.
//    On Windows Docker can publish a port that a native service already listens on, and
//    connections then reach the wrong server, so the check is done here, not left to Docker.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const envFile = join(root, '.env');
const exampleFile = join(root, '.env.example');

if (!existsSync(envFile)) {
  copyFileSync(exampleFile, envFile);
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

// Only the stack's own ports (the *_PORT keys of .env.example), with their current values;
// other *_PORT variables of the shell (KUBERNETES_PORT, SSH_PORT…) are none of our business.
const names = Object.keys(parseEnv(readFileSync(exampleFile, 'utf8'))).filter((n) =>
  n.endsWith('_PORT'),
);
const isPort = (value) => /^\d+$/.test(value ?? '') && Number(value) >= 1 && Number(value) <= 65535;
const invalid = names.filter((n) => !isPort(process.env[n]));
if (invalid.length > 0) {
  const list = invalid.map((n) => `${n}=${process.env[n] ?? ''}`).join(', ');
  console.error(
    `Not a port number: ${list}.\n` +
      'Set an integer from 1 to 65535 in .env (or in your shell, which overrides .env).',
  );
  process.exit(1);
}
const ports = names.map((name) => [name, Number(process.env[name])]);
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
