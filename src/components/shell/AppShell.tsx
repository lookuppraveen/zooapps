import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readableModules } from "@/lib/rbac";
import { switchRole, signOutAction } from "@/app/(app)/_actions/session";
import { Sidebar } from "./Sidebar";
import { SyntheticDataBanner } from "./SyntheticDataBanner";
import { TopBar } from "./TopBar";
import { ScenarioStepper } from "@/components/scenario/ScenarioStepper";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase();
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const t0 = Date.now();
  const session = await auth();
  const tAuth = Date.now();
  if (!session?.user) redirect("/login");

  const visible = await readableModules(session.user.role);
  const tRbac = Date.now();

  const demoUsers = await db.user.findMany({
    include: { role: { select: { name: true } } },
    orderBy: { role: { key: "asc" } },
  });
  const tUsers = Date.now();
  console.log(`[AppShell] auth=${tAuth - t0}ms rbac=${tRbac - tAuth}ms users=${tUsers - tRbac}ms total=${tUsers - t0}ms`);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Keyboard skip link — revealed on Tab from the top of the page. */}
      <a
        href="#main-content"
        className="sr-only absolute left-2 top-2 z-50 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white shadow-card focus:not-sr-only"
      >
        Skip to main content
      </a>
      <Sidebar visibleModules={visible} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={session.user.name ?? session.user.email ?? "User"}
          roleName={session.user.roleName}
          initials={initials(session.user.name ?? session.user.email ?? "?")}
          demoUsers={demoUsers.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            roleName: u.role.name,
          }))}
          onSwitchRole={switchRole}
          onSignOut={signOutAction}
        />
        <SyntheticDataBanner />
        <ScenarioStepper />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-surface focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
