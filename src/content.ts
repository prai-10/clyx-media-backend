import { createHash } from 'node:crypto';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
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

type PublicContent = { blocks: Record<string, Fields>; collections: Record<CollectionName, Fields[]> };

/** Which parts of the site content a page needs. Leaving both out means everything. */
export type PublicScope = { blocks?: readonly BlockName[]; collections?: readonly CollectionName[] };

/** A ready-to-send response body: serialized once, compressed once, shared by every visitor. */
export type PublicPayload = { body: string; etag: string; gzip: Buffer | null };

const gzipAsync = promisify(gzip);
// Below this a gzip header costs more than it saves.
const GZIP_MIN_BYTES = 1024;
// A page only ever asks for a handful of combinations; this caps memory if someone sends random ones.
const MAX_CACHED_SCOPES = 64;

// Visitors hit this on every page load, so the built response is kept in memory. Every write below clears it,
// and the short TTL covers writes made by another server instance.
const PUBLIC_CACHE_TTL_MS = 60_000;
type PublicSnapshot = { value: PublicContent; at: number; payloads: Map<string, Promise<PublicPayload>> };
let publicSnapshot: PublicSnapshot | null = null;
let publicBuild: Promise<PublicSnapshot> | null = null;
// Bumped by every write so a build that started before the write cannot put stale content back in the cache.
let publicGeneration = 0;

const invalidatePublicCache = () => {
  publicGeneration++;
  publicSnapshot = null;
  publicBuild = null;
};

async function buildPublicContent(): Promise<PublicContent> {
  // Hidden cards are filtered in SQL and only the columns the site renders are read.
  const [blockRows, itemRows] = await Promise.all([
    db.select().from(siteBlocks),
    db
      .select({ id: contentItems.id, collection: contentItems.collection, data: contentItems.data })
      .from(contentItems)
      .where(eq(contentItems.isHidden, false))
      .orderBy(asc(contentItems.sortOrder), asc(contentItems.createdAt)),
  ]);
  const blocks: Record<string, Fields> = {};
  for (const row of blockRows) blocks[row.key] = row.value;
  const collections = emptyCollections<Fields>();
  for (const row of itemRows) {
    if (!(row.collection in collections)) continue;
    collections[row.collection as CollectionName].push({ id: row.id, ...row.data });
  }
  return { blocks, collections };
}

/** One database read no matter how many visitors arrive while it is running. */
function loadPublicSnapshot(): Promise<PublicSnapshot> {
  if (publicBuild) return publicBuild;
  const generation = publicGeneration;
  const build: Promise<PublicSnapshot> = buildPublicContent()
    .then((value) => {
      const snapshot: PublicSnapshot = { value, at: Date.now(), payloads: new Map() };
      if (generation === publicGeneration) publicSnapshot = snapshot;
      return snapshot;
    })
    .finally(() => {
      if (publicBuild === build) publicBuild = null;
    });
  publicBuild = build;
  return build;
}

async function getPublicSnapshot(): Promise<PublicSnapshot> {
  if (!publicSnapshot) return loadPublicSnapshot();
  // Past the TTL the old copy is still served instantly while a fresh one is loaded in the background,
  // so no visitor waits on the database once the cache is warm.
  if (Date.now() - publicSnapshot.at >= PUBLIC_CACHE_TTL_MS) {
    loadPublicSnapshot().catch((err) => console.error('public content refresh failed', err));
  }
  return publicSnapshot;
}

function scopeKey(scope: PublicScope) {
  const blocks = [...new Set(scope.blocks ?? [])].sort();
  const collections = [...new Set(scope.collections ?? [])].sort();
  return scope.blocks || scope.collections ? `b=${blocks.join(',')}&c=${collections.join(',')}` : 'all';
}

function pickPublicContent(content: PublicContent, scope: PublicScope): Partial<PublicContent> {
  if (!scope.blocks && !scope.collections) return content;
  const blocks: Record<string, Fields> = {};
  for (const key of scope.blocks ?? []) if (key in content.blocks) blocks[key] = content.blocks[key];
  const collections = {} as Record<CollectionName, Fields[]>;
  for (const name of scope.collections ?? []) collections[name] = content.collections[name];
  return { blocks, collections };
}

async function buildPublicPayload(content: PublicContent, scope: PublicScope): Promise<PublicPayload> {
  const body = JSON.stringify(pickPublicContent(content, scope));
  const etag = `W/"${createHash('sha1').update(body).digest('base64url').slice(0, 22)}"`;
  const gzipped = body.length >= GZIP_MIN_BYTES ? await gzipAsync(body, { level: 9 }) : null;
  return { body, etag, gzip: gzipped };
}

/**
 * What the public website renders, limited to what the requesting page shows: hidden cards are left out and
 * each card is `{ id, ...fields }`. The serialized and gzipped bytes are cached per combination.
 */
export async function getPublicPayload(scope: PublicScope = {}): Promise<PublicPayload> {
  const snapshot = await getPublicSnapshot();
  const key = scopeKey(scope);
  let payload = snapshot.payloads.get(key);
  if (!payload) {
    if (snapshot.payloads.size >= MAX_CACHED_SCOPES) snapshot.payloads.clear();
    payload = buildPublicPayload(snapshot.value, scope);
    snapshot.payloads.set(key, payload);
    payload.catch(() => snapshot.payloads.delete(key));
  }
  return payload;
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
