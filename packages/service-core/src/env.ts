import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { type Type } from '@nestjs/common';
import { plainToInstance, Transform } from 'class-transformer';
import {
  getMetadataStorage,
  IsBoolean,
  IsIn,
  IsInt,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/** Injection token of the validated env object; the service's env class is also injectable. */
export const ENV = Symbol('ENV');

const SECRET = Symbol('secret');

/** The value of this variable never appears in an error message (FR-001) or a log. */
export function Secret(): PropertyDecorator {
  return (target, key) => Reflect.defineMetadata(SECRET, true, target, key);
}

/** `"8080"` → 8080; anything that is not a plain integer stays a string, so `@IsInt` rejects it. */
export const EnvInt = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  );

/** `"true"` / `"false"` → boolean; anything else stays a string, so `@IsBoolean` rejects it. */
export const EnvBool = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );

/** Settings every service has. A service's env class extends it. */
export class BaseEnv {
  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL: string = 'info';

  /** Human-readable logs instead of JSON lines; for a local terminal. */
  @EnvBool()
  @IsBoolean()
  LOG_PRETTY: boolean = false;

  /** How long in-flight requests may take to finish after a stop signal (FR-060). */
  @EnvInt()
  @IsInt()
  @Min(1)
  @Max(600_000)
  SHUTDOWN_TIMEOUT_MS: number = 8000;
}

/**
 * Reads the variables the class declares from the environment (after loading `envFile`),
 * checks them all at once and throws one error naming every bad one (FR-001).
 */
export function loadEnv<E extends object>(
  envClass: Type<E>,
  envFile?: string,
  source: NodeJS.ProcessEnv = process.env,
): E {
  if (envFile && source === process.env && existsSync(envFile)) process.loadEnvFile(envFile);

  const names = [
    ...new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(envClass, '', true, false)
        .map((m) => m.propertyName),
    ),
  ];
  const plain = Object.fromEntries(
    names.filter((n) => source[n] !== undefined).map((n) => [n, source[n]]),
  );
  const env = plainToInstance(envClass, plain);
  const errors = validateSync(env, { forbidUnknownValues: true });
  if (errors.length === 0) return env;

  const lines = errors.map((e) => {
    const raw = source[e.property];
    const secret = Reflect.getMetadata(SECRET, envClass.prototype as object, e.property) === true;
    const got = raw === undefined ? 'not set' : secret ? 'value hidden' : `got "${raw}"`;
    return `  ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')} (${got})`;
  });
  throw new Error(`Invalid configuration, the service cannot start:\n${lines.join('\n')}`);
}
