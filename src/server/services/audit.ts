import type { Prisma, RoleKey } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditPayload = {
  actorId?: string | null;
  actorRole?: RoleKey | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  meta?: Prisma.InputJsonValue;
};

/**
 * Append-only audit log. Every AI action, mutation, or access denial
 * flows through here. Storage is `audit_events` — the schema has no
 * update/delete methods exposed anywhere in the app.
 *
 * Callers should never `await` this in a hot path that must succeed —
 * a downstream DB blip should not fail the user's request. Fire-and-forget
 * via `void appendAuditEvent(...)` unless you specifically need the row id.
 */
export async function appendAuditEvent(payload: AuditPayload) {
  try {
    return await db.auditEvent.create({
      data: {
        actorId: payload.actorId ?? null,
        actorRole: payload.actorRole ?? null,
        action: payload.action,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId ?? null,
        meta: (payload.meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit failures must never crash the caller. Log to server console
    // and continue — real deployments should ship this to Sentry.
    console.error("[audit] failed to persist event", { payload, err });
    return null;
  }
}
