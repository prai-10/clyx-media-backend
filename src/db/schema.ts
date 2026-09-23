import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Singleton content blocks, one row per block (e.g. "hero").
 * The shape of `value` is validated per key in src/content-schema.ts.
 */
export const siteBlocks = pgTable('site_blocks', {
  key: varchar('key', { length: 60 }).primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

/**
 * Repeating content (team, testimonials, case studies, ...), one row per card.
 * `collection` picks the list, `data` holds the fields validated per collection.
 */
export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collection: varchar('collection', { length: 40 }).notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    isHidden: boolean('is_hidden').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('content_items_collection_sort_idx').on(t.collection, t.sortOrder)],
).enableRLS();

/** Uploaded images. The file itself lives in Supabase Storage at `storagePath`. */
export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  storagePath: text('storage_path').notNull().unique(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export type ContentItem = typeof contentItems.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
