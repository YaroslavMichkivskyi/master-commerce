import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { type BaseEnv, ENV, loadEnv } from './env.js';
import { ProblemFilter } from './errors/problem.filter.js';
import { HealthController } from './health/health.controller.js';
import { READINESS_CHECKS, type ReadinessCheck } from './health/readiness.js';
import { Lifecycle } from './lifecycle.js';
import { httpLoggerOptions } from './logging.js';
import { Metrics, MetricsController } from './metrics/metrics.js';
import { SERVICE_CORE_OPTIONS, type ServiceCoreOptions } from './options.js';

/**
 * The one module a service imports (FR-061). With `createServiceApp` / `startService` it
 * gives config checks, logs, health, metrics, errors, OpenAPI and graceful shutdown.
 */
@Global()
@Module({})
export class ServiceCoreModule {
  static forRoot<E extends BaseEnv>(options: ServiceCoreOptions<E>): DynamicModule {
    const readiness = options.readiness ?? [];
    // Loaded when the app is built, not when this file is imported, so tests can set the
    // environment first.
    const envProvider = { provide: ENV, useFactory: () => loadEnv(options.env, options.envFile) };
    return {
      module: ServiceCoreModule,
      imports: [
        TerminusModule,
        LoggerModule.forRootAsync({
          providers: [envProvider],
          inject: [ENV],
          useFactory: (env: BaseEnv) => {
            const http = httpLoggerOptions(env, options);
            return { pinoHttp: options.logDestination ? [http, options.logDestination] : http };
          },
        }),
      ],
      controllers: [HealthController, MetricsController],
      providers: [
        { provide: SERVICE_CORE_OPTIONS, useValue: options },
        envProvider,
        // The service injects its own env class: `constructor(env: CatalogEnv)`.
        { provide: options.env, useExisting: ENV },
        ...readiness,
        {
          provide: READINESS_CHECKS,
          inject: readiness,
          useFactory: (...checks: ReadinessCheck[]) => checks,
        },
        Lifecycle,
        { provide: Metrics, useFactory: () => new Metrics(options.service) },
        { provide: APP_FILTER, useClass: ProblemFilter },
      ],
      exports: [SERVICE_CORE_OPTIONS, ENV, options.env, Lifecycle, Metrics],
    };
  }
}
