import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
