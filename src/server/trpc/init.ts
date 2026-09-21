import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { ModuleKey } from "@prisma/client";
import { canRead as rbacCanRead, canAct as rbacCanAct } from "@/lib/rbac";
import { appendAuditEvent } from "@/server/services/audit";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

// ─── Middlewares ───────────────────────────────────────────────────────

const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

const audited = t.middleware(async ({ path, type, ctx, next }) => {
  const result = await next();
  // Fire-and-forget: don't block the response. Read/query calls are only
  // audited when they explicitly opt in via `.use(auditedRead)` on a
  // sensitive procedure; every mutation is audited by default.
  if (type === "mutation") {
    void appendAuditEvent({
      actorId: ctx.session?.user?.id ?? null,
      actorRole: ctx.session?.user?.role ?? null,
      action: `trpc.${path}`,
      resourceType: "trpc.procedure",
      resourceId: path,
      meta: { ok: result.ok, type },
    });
  }
  return result;
});

// ─── Procedure builders ────────────────────────────────────────────────

export const publicProcedure = t.procedure.use(audited);
export const protectedProcedure = t.procedure.use(requireAuth).use(audited);

/**
 * Build a procedure that requires the caller's role to have `read` (or
 * `act`) on a specific module. Fails with 403 otherwise, and the denial
 * itself is written to the audit trail.
 *
 *   listAssets: moduleProcedure("facilities", "read").query(...)
 */
export function moduleProcedure(module: ModuleKey, action: "read" | "act" = "read") {
  return protectedProcedure.use(async ({ ctx, next, path }) => {
    const ok =
      action === "read"
        ? await rbacCanRead(ctx.user.role, module)
        : await rbacCanAct(ctx.user.role, module);
    if (!ok) {
      void appendAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: `access.denied`,
        resourceType: "trpc.procedure",
        resourceId: path,
        meta: { module, action },
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your role cannot ${action} ${module}`,
      });
    }
    return next();
  });
}
