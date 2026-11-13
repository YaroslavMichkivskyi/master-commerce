/**
 * A dependency the service cannot work without (FR-021), e.g. its database. `check`
 * resolves when it is usable and throws otherwise; the error goes to the log only.
 */
export interface ReadinessCheck {
  readonly name: string;
  check(): Promise<void>;
}

export const READINESS_CHECKS = Symbol('READINESS_CHECKS');
