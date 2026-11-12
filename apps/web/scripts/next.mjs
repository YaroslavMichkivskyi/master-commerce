// Runs the Next.js CLI with the repo-root `.env` loaded and WEB_PORT as the port (FR-042).
// Plain Node, so the same script works on Windows, macOS and Linux.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const [command = 'dev', ...rest] = process.argv.slice(2);
const args = [command, ...rest];
if (command === 'dev' || command === 'start') args.push('--port', process.env.WEB_PORT ?? '3000');

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit' });

// A stop signal sent only to this wrapper (turbo, `kill`, a closed terminal) must reach
// Next too, or Next keeps running and holds WEB_PORT. The wrapper exits when Next does.
const forwarded = ['SIGINT', 'SIGTERM', 'SIGHUP'];
for (const signal of forwarded) process.on(signal, () => child.kill(signal));

child.on('exit', (code, signal) => {
  if (!signal) process.exit(code ?? 0);
  // Re-raise Next's signal on the wrapper with the default handler, for the right exit status.
  for (const s of forwarded) process.removeAllListeners(s);
  process.kill(process.pid, signal);
});
