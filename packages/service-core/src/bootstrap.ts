import { type INestApplication, Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { type BaseEnv, ENV } from './env.js';
import { validationPipe } from './errors/validation.js';
import { shutDown } from './lifecycle.js';
import { Metrics } from './metrics/metrics.js';
import { setupOpenApi } from './openapi.js';
import { SERVICE_CORE_OPTIONS, type ServiceCoreOptions } from './options.js';
import { requestContext } from './request-context.js';

/** The root module of a service (a class decorated with `@Module`). */
type AppModule = Parameters<typeof NestFactory.create>[0];

/**
 * Builds the app of a module that imports `ServiceCoreModule`, without listening: what
 * `startService` runs, and what integration tests use.
 */
export async function createServiceApp(appModule: AppModule): Promise<INestApplication> {
  // abortOnError: false — a bad config reaches the caller as an error instead of killing
  // the process with the message still in the log buffer.
  const app = await NestFactory.create(appModule, { bufferLogs: true, abortOnError: false });
  app.useLogger(app.get(Logger));
  // Before the module middleware (the request logger), so the id exists when it logs.
  app.use(requestContext);
  app.use(app.get(Metrics).middleware);
  app.useGlobalPipes(validationPipe());
  setupOpenApi(app, app.get<ServiceCoreOptions>(SERVICE_CORE_OPTIONS));
  return app;
}

/**
 * The whole `main.ts` of a service (FR-061): build, listen on the configured port, stop
 * gracefully on SIGTERM / SIGINT (FR-060). A bad config ends the process with code 1.
 */
export async function startService(appModule: AppModule): Promise<INestApplication> {
  let app: INestApplication;
  try {
    app = await createServiceApp(appModule);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  const options = app.get<ServiceCoreOptions>(SERVICE_CORE_OPTIONS);
  const env = app.get<BaseEnv & Record<string, unknown>>(ENV);
  await app.listen(env[options.portVariable] as number);

  const logger = new NestLogger('Lifecycle');
  let stopping = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      if (stopping) return; // a second Ctrl+C does not start a second shutdown
      stopping = true;
      logger.log(`${signal} received, stopping`);
      void shutDown(app, env.SHUTDOWN_TIMEOUT_MS);
    });
  }
  logger.log(`${options.service} listening on ${await app.getUrl()}`);
  return app;
}
