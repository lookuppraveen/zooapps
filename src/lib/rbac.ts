import type { ModuleKey, RoleKey } from "@prisma/client";
import { db } from "@/lib/db";

export type AccessRow = {
  module: ModuleKey;
  canRead: boolean;
  canAct: boolean;
};

// Access matrix is small (6 roles × 6 modules) and rarely changes — cache it
// in process for the lifetime of the server. Cleared on hot reload.
let cache: Map<RoleKey, Map<ModuleKey, AccessRow>> | null = null;

export async function getAccessMatrix() {
  if (cache) return cache;
  const rows = await db.roleModuleAccess.findMany({
    include: { role: { select: { key: true } } },
  });
  const map = new Map<RoleKey, Map<ModuleKey, AccessRow>>();
  for (const r of rows) {
    if (!map.has(r.role.key)) map.set(r.role.key, new Map());
    map.get(r.role.key)!.set(r.module, {
      module: r.module,
      canRead: r.canRead,
      canAct: r.canAct,
    });
  }
  cache = map;
  return map;
}

export function invalidateAccessCache() {
  cache = null;
}

export async function canRead(role: RoleKey, mod: ModuleKey): Promise<boolean> {
  const m = await getAccessMatrix();
  return m.get(role)?.get(mod)?.canRead ?? false;
}

export async function canAct(role: RoleKey, mod: ModuleKey): Promise<boolean> {
  const m = await getAccessMatrix();
  return m.get(role)?.get(mod)?.canAct ?? false;
}

export async function readableModules(role: RoleKey): Promise<ModuleKey[]> {
  const m = await getAccessMatrix();
  const perRole = m.get(role);
  if (!perRole) return [];
  return [...perRole.entries()].filter(([, v]) => v.canRead).map(([k]) => k);
}
