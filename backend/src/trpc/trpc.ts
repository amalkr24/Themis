import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to ensure user is logged in
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Middleware to check if user has Admin role
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permissions required' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(isAdmin);

// Middleware to check if user has Advocate role
const isAdvocate = t.middleware(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== 'advocate' && ctx.user.role !== 'admin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Advocate permissions required' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const advocateProcedure = t.procedure.use(isAdvocate);
