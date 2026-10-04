import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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

/**
 * One course purchase from the website's checkout chat: the buyer pays by UPI QR and sends the UTR / transaction ID,
 * then the team checks it against the UPI app and shares the class link on WhatsApp. No payment gateway is involved.
 * `paymentRef` is unique, so one transaction can never be claimed twice.
 */
export const courseOrders = pgTable(
  'course_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Short order ID shown to the buyer and put in the UPI payment note, e.g. "CLX-7KQ2M9".
    ref: varchar('ref', { length: 16 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull().default(''),
    courseId: varchar('course_id', { length: 64 }).notNull().default(''),
    courseTitle: varchar('course_title', { length: 200 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentRef: varchar('payment_ref', { length: 40 }).notNull().unique(),
    // submitted -> verified -> link_sent, or rejected.
    status: varchar('status', { length: 20 }).notNull().default('submitted'),
    adminNote: text('admin_note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('course_orders_status_created_idx').on(t.status, t.createdAt), index('course_orders_created_idx').on(t.createdAt)],
).enableRLS();

export type ContentItem = typeof contentItems.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type CourseOrder = typeof courseOrders.$inferSelect;
