import { Inject, Injectable } from '@nestjs/common';
import { type CategoryListDto } from '@master-commerce/dto';
import { asc } from 'drizzle-orm';
import { DB, type Database } from '../db/database.js';
import { category, type CategoryRow } from '../db/schema.js';

/** Internal columns (`created_at`) never leave the service. */
export function toListDto(rows: readonly CategoryRow[]): CategoryListDto {
  return {
    items: rows.map(({ id, name, slug, sortOrder }) => ({ id, name, slug, sortOrder })),
  };
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(): Promise<CategoryListDto> {
    const rows = await this.db
      .select()
      .from(category)
      .orderBy(asc(category.sortOrder), asc(category.name));
    return toListDto(rows);
  }
}
