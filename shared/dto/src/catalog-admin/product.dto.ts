import type { Type as Class } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditedDto, PageInfoDto, PageQueryDto, SLUG_PATTERN } from './common.dto.js';

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;
/** The largest price `integer` cents hold: 21 474 836.47 EUR. */
export const PRICE_CENTS_MAX = 2_147_483_647;

/** A thing the shop sells (FR-020). */
export class ProductDto extends AuditedDto {
  @ApiProperty({ example: 'ASUS Dual GeForce RTX 4060 8GB' })
  name!: string;

  @ApiProperty({ example: 'asus-dual-geforce-rtx-4060-8gb' })
  slug!: string;

  @ApiProperty({ example: 'ASUS-DUAL-RTX4060-O8G' })
  sku!: string;

  @ApiProperty({ example: '' })
  description!: string;

  @ApiProperty({ format: 'uuid' })
  brandId!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 32999, description: 'EUR cents, VAT included (FR-021)' })
  priceCents!: number;

  @ApiProperty({ example: 12 })
  stock!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { chipset: 'GeForce RTX 4060', memory_size: 8, memory_type: 'GDDR6' },
    description: 'Attribute code → value, checked against the category (FR-023)',
  })
  specs!: Record<string, unknown>;

  @ApiProperty({ example: false })
  published!: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'ASUS Dual GeForce RTX 4060 8GB', minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({
    example: 'asus-dual-geforce-rtx-4060-8gb',
    pattern: SLUG_PATTERN.source,
    maxLength: 100,
  })
  @Matches(SLUG_PATTERN)
  @Length(1, 100)
  slug!: string;

  @ApiProperty({ example: 'ASUS-DUAL-RTX4060-O8G', pattern: SKU_PATTERN.source, maxLength: 40 })
  @Matches(SKU_PATTERN)
  @Length(1, 40)
  sku!: string;

  @ApiPropertyOptional({ example: 'Two fans, 2.5 slots.', maxLength: 10_000, default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  brandId!: string;

  @ApiProperty({ format: 'uuid', description: 'A category without children' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    example: 32999,
    minimum: 1,
    maximum: PRICE_CENTS_MAX,
    description: 'EUR cents, VAT included',
  })
  @IsInt()
  @Min(1)
  @Max(PRICE_CENTS_MAX)
  priceCents!: number;

  @ApiPropertyOptional({ example: 12, minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  stock?: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { chipset: 'GeForce RTX 4060', memory_size: 8, memory_type: 'GDDR6' },
  })
  @IsObject()
  specs!: Record<string, unknown>;
}

/** Any of the create fields; a new `categoryId` re-checks the specs. */
// Annotated, so the declaration file names the type portably.
const PartialCreateProductDto: Class<Partial<CreateProductDto>> = PartialType(CreateProductDto);
export class UpdateProductDto extends PartialCreateProductDto {}

/** `GET /admin/products` filters (FR-024). */
export class ProductListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  // Query strings are text: "true" / "false" become booleans, anything else is refused.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  published?: boolean;
}

export class ProductPageDto extends PageInfoDto {
  @ApiProperty({ type: () => [ProductDto] })
  items!: ProductDto[];
}
