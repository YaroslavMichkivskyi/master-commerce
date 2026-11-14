import { Injectable, type INestApplication, Logger, type OnModuleDestroy } from '@nestjs/common';

/** Knows whether the service is stopping; readiness turns `503` from the first moment. */
@Injectable()
export class Lifecycle implements OnModuleDestroy {
  shuttingDown = false;

  // The first hook Nest runs in `app.close()`, before the HTTP server stops.
  onModuleDestroy(): void {
    this.shuttingDown = true;
  }
}

/**
 * Stops the app (FR-060): no new requests, in-flight ones finish, connections close via
 * the shutdown hooks, then `exit(0)`. Past `timeoutMs` → `exit(1)`, whatever is still open.
 */
export async function shutDown(
  app: INestApplication,
  timeoutMs: number,
  exit: (code: number) => void = (code) => process.exit(code),
): Promise<void> {
  const logger = new Logger('Lifecycle');
  app.get(Lifecycle).shuttingDown = true;
  const watchdog = setTimeout(() => {
    logger.error(`Shutdown took longer than ${timeoutMs} ms, exiting anyway`);
    exit(1);
  }, timeoutMs);
  watchdog.unref();
  try {
    await app.close();
    clearTimeout(watchdog);
    logger.log('Stopped');
    exit(0);
  } catch (error) {
    clearTimeout(watchdog);
    logger.error(error instanceof Error ? error : String(error));
    exit(1);
  }
}
