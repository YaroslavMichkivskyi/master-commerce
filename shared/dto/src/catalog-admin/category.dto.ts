import type { Type as Class } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AuditedDto, SLUG_PATTERN } from './common.dto.js';

export const ATTRIBUTE_TYPES = ['select', 'multi_select', 'number', 'boolean', 'text'] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

/**
 * A property the products of a category have (FR-011). Which limits a type takes (a
 * list for `select`, a unit and range for `number`, a length for `text`) is checked by
 * catalog-service, which answers `400` naming the field.
 */
export class AttributeDto {
  @ApiProperty({ example: 'memory_size', pattern: '^[a-z][a-z0-9_]*$', maxLength: 50 })
  @Matches(/^[a-z][a-z0-9_]*$/)
  @Length(1, 50)
  code!: string;

  @ApiProperty({ example: 'Memory size', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ enum: ATTRIBUTE_TYPES, example: 'number' })
  @IsIn(ATTRIBUTE_TYPES)
  type!: AttributeType;

  @ApiProperty({ example: true })
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['GDDR6', 'GDDR6X'],
    description: '`select` and `multi_select` only, required for them',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  allowedValues?: string[];

  @ApiPropertyOptional({ example: 'GB', maxLength: 20, description: '`number` only' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  unit?: string;

  @ApiPropertyOptional({ example: 1, description: '`number` only' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  minValue?: number;

  @ApiPropertyOptional({ example: 64, description: '`number` only' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  maxValue?: number;

  @ApiPropertyOptional({ example: true, description: '`number` only' })
  @IsOptional()
  @IsBoolean()
  wholeNumbers?: boolean;

  @ApiPropertyOptional({
    example: 50,
    minimum: 1,
    maximum: 500,
    description: '`text` only, required for it',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxLength?: number;
}

/** `PUT /admin/categories/{id}/attributes`: the category's own attributes, as a whole. */
export class ReplaceAttributesDto {
  @ApiProperty({ type: () => [AttributeDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes!: AttributeDto[];
}

/** A category with its own and inherited attributes (FR-010…FR-015). */
export class CategoryDetailDto extends AuditedDto {
  @ApiProperty({ example: 'Graphics cards' })
  name!: string;

  @ApiProperty({ example: 'graphics-cards' })
  slug!: string;

  @ApiProperty({ example: 20 })
  sortOrder!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ type: () => [AttributeDto], description: 'Defined by this category' })
  attributes!: AttributeDto[];

  @ApiProperty({
    type: () => [AttributeDto],
    description: 'Defined by its ancestors, nearest last; products must satisfy them too',
  })
  inheritedAttributes!: AttributeDto[];
}

/** One node of `GET /admin/categories/tree`. */
export class CategoryTreeNodeDto extends AuditedDto {
  @ApiProperty({ example: 'Graphics cards' })
  name!: string;

  @ApiProperty({ example: 'graphics-cards' })
  slug!: string;

  @ApiProperty({ example: 20 })
  sortOrder!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ type: () => [AttributeDto] })
  attributes!: AttributeDto[];

  @ApiProperty({ type: () => [CategoryTreeNodeDto] })
  children!: CategoryTreeNodeDto[];
}

export class CategoryTreeDto {
  @ApiProperty({ type: () => [CategoryTreeNodeDto], description: 'Top-level categories' })
  items!: CategoryTreeNodeDto[];
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Graphics cards', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 'graphics-cards', pattern: SLUG_PATTERN.source, maxLength: 100 })
  @Matches(SLUG_PATTERN)
  @Length(1, 100)
  slug!: string;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Omit or null for a top-level category',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

/** A change of name, slug, order, or a move to another parent (`parentId`). */
// Annotated, so the declaration file names the type portably.
const PartialCreateCategoryDto: Class<Partial<CreateCategoryDto>> = PartialType(CreateCategoryDto);
export class UpdateCategoryDto extends PartialCreateCategoryDto {}
