import { TRPCError } from '@trpc/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from './db/client.js';
import { contentItems, siteBlocks } from './db/schema.js';
import {
  blockNames,
  blockSchemas,
  collectionNames,
  collectionSchemas,
  type BlockName,
  type CollectionName,
} from './content-schema.js';
import { seedBlocks, seedCollections } from './seed-data.js';

type Fields = Record<string, unknown>;
export type AdminItem = { id: string; isHidden: boolean; sortOrder: number; data: Fields };

function emptyCollections<T>(): Record<CollectionName, T[]> {
  return Object.fromEntries(collectionNames.map((name) => [name, [] as T[]])) as Record<CollectionName, T[]>;
}

async function loadRows() {
  const [blockRows, itemRows] = await Promise.all([
    db.select().from(siteBlocks),
    db.select().from(contentItems).orderBy(asc(contentItems.sortOrder), asc(contentItems.createdAt)),
  ]);
  const blocks: Record<string, Fields> = {};
  for (const row of blockRows) blocks[row.key] = row.value;
  return { blocks, itemRows };
}

// Visitors hit this on every page load, so the built response is kept in memory. Every write below clears it,
// and the short TTL covers writes made by another server instance.
const PUBLIC_CACHE_TTL_MS = 60_000;
let publicCache: { value: Awaited<ReturnType<typeof buildPublicContent>>; at: number } | null = null;
const invalidatePublicCache = () => {
  publicCache = null;
};

async function buildPublicContent() {
  const { blocks, itemRows } = await loadRows();
  const collections = emptyCollections<Fields>();
  for (const row of itemRows) {
    if (row.isHidden || !(row.collection in collections)) continue;
    collections[row.collection as CollectionName].push({ id: row.id, ...row.data });
  }
  return { blocks, collections };
}

/** What the public website renders: hidden cards are left out and each card is `{ id, ...fields }`. */
export async function getPublicContent() {
  if (publicCache && Date.now() - publicCache.at < PUBLIC_CACHE_TTL_MS) return publicCache.value;
  const value = await buildPublicContent();
  publicCache = { value, at: Date.now() };
  return value;
}

/** What the admin panel edits: everything, including hidden cards, with fields kept under `data`. */
export async function getAdminContent() {
  const { blocks, itemRows } = await loadRows();
  const collections = emptyCollections<AdminItem>();
  for (const row of itemRows) {
    if (!(row.collection in collections)) continue;
    collections[row.collection as CollectionName].push({
      id: row.id,
      isHidden: row.isHidden,
      sortOrder: row.sortOrder,
      data: row.data,
    });
  }
  return { blocks, collections };
}

function parseFields(schema: { safeParse: (v: unknown) => any }, input: unknown): Fields {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ');
    throw new TRPCError({ code: 'BAD_REQUEST', message });
  }
  return result.data;
}

export async function saveBlock(key: BlockName, input: unknown) {
  const value = parseFields(blockSchemas[key], input);
  await db
    .insert(siteBlocks)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteBlocks.key, set: { value, updatedAt: new Date() } });
  invalidatePublicCache();
  return value;
}

/** New cards go to the end of the list, or to the top with position "start". */
export async function createItem(collection: CollectionName, input: unknown, position: 'start' | 'end' = 'end') {
  const data = parseFields(collectionSchemas[collection], input);
  const [{ next }] = await db
    .select({
      next:
        position === 'start'
          ? sql<number>`coalesce(min(${contentItems.sortOrder}), 1) - 1`
          : sql<number>`coalesce(max(${contentItems.sortOrder}), -1) + 1`,
    })
    .from(contentItems)
    .where(eq(contentItems.collection, collection));
  const [row] = await db.insert(contentItems).values({ collection, data, sortOrder: Number(next) }).returning();
  invalidatePublicCache();
  return row;
}

export async function updateItem(id: string, patch: { data?: unknown; isHidden?: boolean }) {
  const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, id));
  if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found.' });

  const set: Partial<typeof contentItems.$inferInsert> = { updatedAt: new Date() };
  if (patch.data !== undefined) {
    set.data = parseFields(collectionSchemas[existing.collection as CollectionName], patch.data);
  }
  if (patch.isHidden !== undefined) set.isHidden = patch.isHidden;

  const [row] = await db.update(contentItems).set(set).where(eq(contentItems.id, id)).returning();
  invalidatePublicCache();
  return row;
}

export async function deleteItem(id: string) {
  const deleted = await db.delete(contentItems).where(eq(contentItems.id, id)).returning({ id: contentItems.id });
  if (!deleted.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found.' });
  invalidatePublicCache();
}

/** Swaps an item with its neighbour and renumbers the list so order stays gap-free. */
export async function moveItem(id: string, direction: 'up' | 'down') {
  await db.transaction(async (tx) => {
    const [item] = await tx.select().from(contentItems).where(eq(contentItems.id, id));
    if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found.' });

    const siblings = await tx
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.collection, item.collection))
      .orderBy(asc(contentItems.sortOrder), asc(contentItems.createdAt));

    const from = siblings.findIndex((s) => s.id === id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= siblings.length) return;

    [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
    for (const [index, sibling] of siblings.entries()) {
      await tx.update(contentItems).set({ sortOrder: index }).where(eq(contentItems.id, sibling.id));
    }
  });
  invalidatePublicCache();
}

/** Fills an empty database with the content the site launched with. Never overwrites existing content. */
export async function seedIfEmpty({ force = false } = {}) {
  const [{ count: itemCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(contentItems);
  const [{ count: blockCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(siteBlocks);
  if (!force && (itemCount > 0 || blockCount > 0)) return { seeded: false, itemCount, blockCount };

  await db.transaction(async (tx) => {
    if (force) {
      await tx.delete(contentItems);
      await tx.delete(siteBlocks);
    }
    for (const key of blockNames) {
      await tx.insert(siteBlocks).values({ key, value: parseFields(blockSchemas[key], seedBlocks[key]) });
    }
    for (const collection of collectionNames) {
      const rows = seedCollections[collection].map((fields, sortOrder) => ({
        collection,
        data: parseFields(collectionSchemas[collection], fields),
        sortOrder,
      }));
      if (rows.length) await tx.insert(contentItems).values(rows);
    }
  });
  invalidatePublicCache();
  return { seeded: true };
}
