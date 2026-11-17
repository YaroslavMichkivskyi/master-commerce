import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Lowercase words joined by single dashes: `graphics-cards`. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PAGE_SIZE_DEFAULT = 50;
export const PAGE_SIZE_MAX = 200;

/** What every catalog entity carries: identity, version, audit (FR-031, FR-033). */
export class AuditedDto {
  @ApiProperty({ format: 'uuid', example: '0193a7c2-5b1e-7c3d-9a57-1b2c3d4e5f60' })
  id!: string;

  @ApiProperty({
    example: 3,
    description: 'Changes on every update; send it back as `If-Match: "3"` to change the row',
  })
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true, description: 'null until sign-in exists' })
  createdBy!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true, description: 'null until sign-in exists' })
  updatedBy!: string | null;
}

/** Cursor paging of a list (FR-034). */
export class PageQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGE_SIZE_MAX,
    default: PAGE_SIZE_DEFAULT,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_SIZE_MAX)
  limit?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: '`nextCursor` of the previous page; the list continues after it',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

/** The paging part of a page response. */
export class PageInfoDto {
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Pass as `cursor` for the next page; null on the last page',
  })
  nextCursor!: string | null;
}
