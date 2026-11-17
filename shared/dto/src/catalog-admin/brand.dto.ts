import type { Type as Class } from '@nestjs/common';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { AuditedDto, PageInfoDto, SLUG_PATTERN } from './common.dto.js';

/** A maker of hardware: ASUS, AMD (FR-001). */
export class BrandDto extends AuditedDto {
  @ApiProperty({ example: 'ASUS' })
  name!: string;

  @ApiProperty({ example: 'asus' })
  slug!: string;
}

export class CreateBrandDto {
  @ApiProperty({ example: 'ASUS', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 'asus', pattern: SLUG_PATTERN.source, maxLength: 100 })
  @Matches(SLUG_PATTERN)
  @Length(1, 100)
  slug!: string;
}

// Annotated, so the declaration file names the type portably.
const PartialCreateBrandDto: Class<Partial<CreateBrandDto>> = PartialType(CreateBrandDto);
export class UpdateBrandDto extends PartialCreateBrandDto {}

export class BrandPageDto extends PageInfoDto {
  @ApiProperty({ type: () => [BrandDto] })
  items!: BrandDto[];
}
