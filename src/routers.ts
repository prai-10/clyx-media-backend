import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { credentialsValid, signAdminToken } from './auth.js';
import { blockEnum, collectionEnum } from './content-schema.js';
import { createItem, deleteItem, getAdminContent, moveItem, saveBlock, updateItem } from './content.js';
import { db } from './db/client.js';
import { media } from './db/schema.js';
import { removeImage } from './storage.js';
import { adminProcedure, publicProcedure, router } from './trpc.js';

export const appRouter = router({
  health: publicProcedure.query(() => 'OK'),

  auth: router({
    login: publicProcedure
      .input(z.object({ username: z.string().max(200), password: z.string().max(200) }))
      .mutation(async ({ input }) => {
        if (!credentialsValid(input.username, input.password)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password.' });
        }
        return { token: await signAdminToken() };
      }),
    me: publicProcedure.query(({ ctx }) => ({ isAdmin: ctx.isAdmin })),
  }),

  admin: router({
    content: adminProcedure.query(() => getAdminContent()),

    saveBlock: adminProcedure
      .input(z.object({ key: blockEnum, value: z.unknown() }))
      .mutation(({ input }) => saveBlock(input.key, input.value)),

    createItem: adminProcedure
      .input(z.object({ collection: collectionEnum, data: z.unknown(), position: z.enum(['start', 'end']).optional() }))
      .mutation(({ input }) => createItem(input.collection, input.data, input.position)),

    updateItem: adminProcedure
      .input(z.object({ id: z.string().uuid(), data: z.unknown().optional(), isHidden: z.boolean().optional() }))
      .mutation(({ input }) => updateItem(input.id, { data: input.data, isHidden: input.isHidden })),

    deleteItem: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        await deleteItem(input.id);
        return { success: true };
      }),

    moveItem: adminProcedure
      .input(z.object({ id: z.string().uuid(), direction: z.enum(['up', 'down']) }))
      .mutation(async ({ input }) => {
        await moveItem(input.id, input.direction);
        return { success: true };
      }),

    mediaList: adminProcedure.query(() => db.select().from(media).orderBy(desc(media.createdAt)).limit(200)),

    mediaDelete: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const [row] = await db.select().from(media).where(eq(media.id, input.id));
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Image not found.' });
        await removeImage(row.storagePath);
        await db.delete(media).where(eq(media.id, input.id));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
