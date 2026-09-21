import { forbidden, unauthorized } from "next/navigation";
import type { ModuleKey } from "@prisma/client";
import { auth } from "@/auth";
import { canRead, canAct } from "@/lib/rbac";

/**
 * Server-side gate for a module resource. Call at the top of any page
 * or server action that must be role-scoped.
 *
 *   const { session } = await requireModuleAccess("security", "read");
 *
 * Behavior:
 *   - Not signed in → 401 via next/navigation `unauthorized()` (renders app/unauthorized.tsx).
 *   - Signed in but lacks permission → 403 via `forbidden()` (renders app/forbidden.tsx).
 */
export async function requireModuleAccess(
  module: ModuleKey,
  action: "read" | "act" = "read",
) {
  const session = await auth();
  if (!session?.user) unauthorized();

  const ok =
    action === "read"
      ? await canRead(session.user.role, module)
      : await canAct(session.user.role, module);

  if (!ok) forbidden();

  return { session, user: session.user };
}
