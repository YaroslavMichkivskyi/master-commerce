import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const category = pgTable('category', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CategoryRow = typeof category.$inferSelect;
