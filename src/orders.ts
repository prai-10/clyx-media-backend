import { randomInt } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db/client.js';
import { contentItems, courseOrders } from './db/schema.js';

export const orderStatuses = ['submitted', 'verified', 'link_sent', 'rejected'] as const;
export type OrderStatus = (typeof orderStatuses)[number];

// No 0/O or 1/I, so an order ID read out over WhatsApp is never misheard.
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const newRef = () => `CLX-${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join('')}`;

/** What the checkout chat sends once the buyer has paid. The order ID is made here and never shown to the buyer. */
export const orderInputSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ''))
    .pipe(z.string().regex(/^\+?\d{10,15}$/, 'Please enter a valid WhatsApp number.')),
  courseId: z.string().trim().max(64).optional().default(''),
  courseTitle: z.string().trim().min(1, 'Please pick a course.').max(200),
  amount: z.coerce.number().positive('Invalid amount.').max(10_000_000),
  // UTR / UPI transaction ID (UPI Ref No): every UPI app shows it as exactly 12 digits. Spaces and dashes are dropped.
  paymentRef: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]+/g, ''))
    .pipe(z.string().regex(/^\d{12}$/, 'The UTR / UPI transaction ID must be exactly 12 digits.')),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(500).optional(),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

export class DuplicatePaymentError extends Error {}

/**
 * The course as the admin last saved it, when the chat sent a real course id. Its title and price win over what the
 * browser sent. Unknown ids (e.g. the built-in courses shown before the backend had any) keep the browser's values;
 * the team checks the amount in the UPI app before sharing a link either way.
 */
async function savedCourse(courseId: string): Promise<{ title: string; price: number } | null> {
  if (!UUID.test(courseId)) return null;
  const [row] = await db
    .select({ data: contentItems.data })
    .from(contentItems)
    .where(and(eq(contentItems.id, courseId), eq(contentItems.collection, 'courses')))
    .limit(1);
  const title = typeof row?.data.title === 'string' ? row.data.title : '';
  const price = Number(row?.data.price);
  return title && price > 0 ? { title, price } : null;
}

/**
 * Stores one order with a single INSERT. The unique ref / paymentRef constraints settle races between simultaneous
 * buyers in the database itself, so this needs no locks and stays cheap under a burst of checkouts.
 * Re-sending the same order (double tap, retry after a timeout: same UTR, name and phone) returns the saved one
 * instead of failing; the same UTR from anyone else is refused.
 */
export async function createCourseOrder(input: OrderInput): Promise<{ ref: string; duplicate: boolean }> {
  const course = await savedCourse(input.courseId);
  let ref = newRef();
  for (let attempt = 0; attempt < 4; attempt++) {
    const [row] = await db
      .insert(courseOrders)
      .values({
        ref,
        name: input.name,
        phone: input.phone,
        courseId: input.courseId,
        courseTitle: course?.title ?? input.courseTitle,
        amount: (course?.price ?? input.amount).toFixed(2),
        paymentRef: input.paymentRef,
      })
      .onConflictDoNothing()
      .returning({ ref: courseOrders.ref });
    if (row) return { ref: row.ref, duplicate: false };

    const [existing] = await db
      .select({ ref: courseOrders.ref, name: courseOrders.name, phone: courseOrders.phone })
      .from(courseOrders)
      .where(eq(courseOrders.paymentRef, input.paymentRef))
      .limit(1);
    if (existing) {
      if (existing.name === input.name && existing.phone === input.phone) return { ref: existing.ref, duplicate: true };
      throw new DuplicatePaymentError('This UTR / transaction ID has already been submitted.');
    }
    ref = newRef(); // the order ID was taken by someone else
  }
  throw new Error('Could not allocate an order ID');
}

const PAGE_SIZE = 50;

export const listOrdersInput = z.object({
  status: z.enum([...orderStatuses, 'all']).default('all'),
  search: z.string().trim().max(80).default(''),
  page: z.number().int().min(0).max(10_000).default(0),
});

/** One page of orders (newest first) for the admin, plus how many orders sit in each status. */
export async function listCourseOrders({ status, search, page }: z.infer<typeof listOrdersInput>) {
  const filters: SQL[] = [];
  if (status !== 'all') filters.push(eq(courseOrders.status, status));
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    filters.push(
      or(
        ilike(courseOrders.name, like),
        ilike(courseOrders.phone, like),
        ilike(courseOrders.ref, like),
        ilike(courseOrders.paymentRef, like),
        ilike(courseOrders.courseTitle, like),
      )!,
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(courseOrders)
      .where(where)
      .orderBy(desc(courseOrders.createdAt), desc(courseOrders.id))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE),
    db.select({ status: courseOrders.status, n: count() }).from(courseOrders).groupBy(courseOrders.status),
  ]);
  const byStatus = Object.fromEntries(orderStatuses.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const row of counts) if (row.status in byStatus) byStatus[row.status as OrderStatus] = Number(row.n);
  return { orders: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE, counts: byStatus };
}

export const updateOrderInput = z.object({
  id: z.string().uuid(),
  status: z.enum(orderStatuses).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

export async function updateCourseOrder({ id, status, adminNote }: z.infer<typeof updateOrderInput>) {
  const [row] = await db
    .update(courseOrders)
    .set({
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(courseOrders.id, id))
    .returning();
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found.' });
  return row;
}
