import { failureMessage, runCli } from './cli.js';

// The entry point of `pnpm datagen`; cli.ts holds the logic, so tests can import it.
runCli().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exit(1);
});
