import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import type { FieldErrorDto } from '@master-commerce/dto';

/** Flattens nested validation errors into `field` paths like `items.0.slug`. */
export function fieldErrors(errors: ValidationError[], prefix = ''): FieldErrorDto[] {
  return errors.flatMap((e) => {
    const field = prefix ? `${prefix}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, messages: Object.values(e.constraints) }] : [];
    return [...own, ...fieldErrors(e.children ?? [], field)];
  });
}

/** Request validation for every route: unknown fields rejected, `400` lists each bad field (FR-041). */
export function validationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: 'The request is invalid',
        errors: fieldErrors(errors),
      }),
  });
}
