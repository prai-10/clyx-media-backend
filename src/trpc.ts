import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { isAdminRequest } from './auth.js';

export async function createContext({ req }: CreateExpressContextOptions) {
  return { isAdmin: await isAdminRequest(req.headers.authorization) };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // Never leak server file paths / stack traces to the browser.
  errorFormatter({ shape }) {
    const { stack: _stack, ...data } = shape.data;
    return { ...shape, data };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please sign in again.' });
  return next();
});
