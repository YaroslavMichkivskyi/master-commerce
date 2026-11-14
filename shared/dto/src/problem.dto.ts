import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** One invalid field of a request, in a `400` problem body. */
export class FieldErrorDto {
  @ApiProperty({ example: 'sortOrder', description: 'Dotted path of the field' })
  field!: string;

  @ApiProperty({ example: ['sortOrder must be an integer number'], type: [String] })
  messages!: string[];
}

/** Error body of every HTTP API, RFC 9457 `application/problem+json`. */
export class ProblemDto {
  @ApiProperty({ example: 'about:blank' })
  type!: string;

  @ApiProperty({ example: 'Service Unavailable' })
  title!: string;

  @ApiProperty({ example: 503 })
  status!: number;

  @ApiPropertyOptional({ example: 'catalog-service is unavailable' })
  detail?: string;

  @ApiPropertyOptional({ example: '/api/v1/categories' })
  instance?: string;

  @ApiPropertyOptional({
    type: [FieldErrorDto],
    description: 'Validation failures (`400` only): every invalid field and why',
  })
  errors?: FieldErrorDto[];
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
