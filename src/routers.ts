import { router, publicProcedure } from './trpc.js';
import { z } from 'zod';

export const appRouter = router({
  health: publicProcedure.query(() => 'OK'),
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),
  content: router({
    list: publicProcedure.query(() => []),
    page: publicProcedure.input(z.object({ page: z.string() })).query(() => []),
  }),
  media: router({
    list: publicProcedure.query(() => []),
  }),
});

export type AppRouter = typeof appRouter;
