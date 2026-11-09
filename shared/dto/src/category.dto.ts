import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, IsUUID, Length, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** A top-level product group of the shop, e.g. "CPUs". */
export class CategoryDto {
  @ApiProperty({ format: 'uuid', example: '4f6c1c9e-2b1a-4d8e-9a57-1b2c3d4e5f60' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'Graphics cards', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 'graphics-cards', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', maxLength: 100 })
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  @Length(1, 100)
  slug!: string;

  @ApiProperty({ example: 20, description: 'Display order, ascending' })
  @IsInt()
  sortOrder!: number;
}

/** A list wrapper, so paging fields can be added later without a breaking change. */
export class CategoryListDto {
  @ApiProperty({ type: () => [CategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  items!: CategoryDto[];
}
