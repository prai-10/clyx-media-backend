import { router, publicProcedure } from './trpc.js';
import { z } from 'zod';

export const appRouter = router({
  health: publicProcedure.query(() => 'OK'),
});

export type AppRouter = typeof appRouter;
