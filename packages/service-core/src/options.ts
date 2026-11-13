import type { Type } from '@nestjs/common';
import type { DestinationStream } from 'pino';
import type { BaseEnv } from './env.js';
import type { ReadinessCheck } from './health/readiness.js';

/** What a service tells service-core about itself; given once to `ServiceCoreModule.forRoot`. */
export interface ServiceCoreOptions<E extends BaseEnv = BaseEnv> {
  /** Service name: logs, metrics, OpenAPI title. */
  service: string;
  version: string;
  /** One line about the API, for the OpenAPI document. */
  description: string;
  /** The service's env class (extends `BaseEnv`); checked at start-up (FR-001). */
  env: Type<E>;
  /** The env variable holding the HTTP port, e.g. `'CATALOG_PORT'`. */
  portVariable: keyof E & string;
  /** `.env` file to load first; values already in the environment win. */
  envFile?: string;
  /** Dependencies the service cannot work without (FR-021). */
  readiness?: Type<ReadinessCheck>[];
  /** Where logs go instead of stdout; for tests. */
  logDestination?: DestinationStream;
}

export const SERVICE_CORE_OPTIONS = Symbol('SERVICE_CORE_OPTIONS');
