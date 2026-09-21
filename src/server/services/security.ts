import type { ModuleKey, RoleKey } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Reads for the Security & Governance module. Materializes the seeded
 * role_module_access into a table the UI can render directly, and
 * queries the append-only audit_events log.
 */

export type AccessCell = { canRead: boolean; canAct: boolean };
export type AccessMatrix = {
  roles: Array<{ key: RoleKey; name: string }>;
  modules: ModuleKey[];
  cells: Record<RoleKey, Record<ModuleKey, AccessCell>>;
};

export async function getAccessMatrix(): Promise<AccessMatrix> {
  const roles = await db.role.findMany({
    orderBy: { key: "asc" },
    select: { key: true, name: true },
  });
  const modules: ModuleKey[] = ["home", "knowledge", "facilities", "executive", "incidents", "security"];
  const rows = await db.roleModuleAccess.findMany({
    include: { role: { select: { key: true } } },
  });

  const cells = {} as AccessMatrix["cells"];
  for (const r of roles) {
    cells[r.key] = {} as Record<ModuleKey, AccessCell>;
    for (const m of modules) cells[r.key][m] = { canRead: false, canAct: false };
  }
  for (const r of rows) {
    cells[r.role.key][r.module] = { canRead: r.canRead, canAct: r.canAct };
  }

  return { roles, modules, cells };
}

export type AuditEntry = {
  id: string;
  occurredAt: Date;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorName: string | null;
  actorRole: RoleKey | null;
  meta: unknown;
};

export async function recentAuditEvents(limit = 50): Promise<AuditEntry[]> {
  const rows = await db.auditEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurredAt,
    action: r.action,
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    actorName: r.actor?.name ?? null,
    actorRole: r.actorRole,
    meta: r.meta,
  }));
}

export async function governanceKpis() {
  const [totalEvents, aiInteractions, userCount] = await Promise.all([
    db.auditEvent.count(),
    db.aiInteraction.count(),
    db.user.count(),
  ]);
  return {
    ssoMfa: true,
    roles: 6,
    users: userCount,
    auditEvents: totalEvents,
    aiInteractions,
    dataClassification: "Synthetic (labeled)",
  };
}
