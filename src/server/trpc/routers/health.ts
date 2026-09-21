import { router, publicProcedure, protectedProcedure } from "../init";

/**
 * Health / identity router — the minimal proof that tRPC + auth + audit
 * are wired end-to-end. Other module routers land in Steps 6–14.
 */
export const healthRouter = router({
  ping: publicProcedure.query(() => ({
    ok: true,
    at: new Date(),
  })),

  whoami: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.user.id,
    email: ctx.user.email,
    name: ctx.user.name,
    role: ctx.user.role,
    roleName: ctx.user.roleName,
  })),
});
