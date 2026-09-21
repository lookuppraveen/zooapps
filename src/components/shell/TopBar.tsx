"use client";

import { Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { GlobalAskBar } from "./GlobalAskBar";
import { RunScenarioButton } from "./RunScenarioButton";
import { RoleMenu } from "./RoleMenu";

type DemoUser = { id: string; email: string; name: string; roleName: string };

type Props = {
  userName: string;
  roleName: string;
  initials: string;
  demoUsers: DemoUser[];
  onSwitchRole: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
};

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
  const first = segments[0];
  const active = MODULES.find((m) => m.href === `/${first ?? ""}`);
  return { active: active ?? MODULES[0], segments };
}

export function TopBar({
  userName,
  roleName,
  initials,
  demoUsers,
  onSwitchRole,
  onSignOut,
}: Props) {
  const { active, segments } = useBreadcrumb();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link href="/" className="text-slate-500 hover:text-slate-900">
          Zoo AI
        </Link>
        {segments.length > 0 && active && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            <span className="font-medium text-slate-900">{active.label}</span>
          </>
        )}
      </nav>

      <div className="flex-1">
        <GlobalAskBar />
      </div>

      <div className="flex items-center gap-2">
        <RunScenarioButton />
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <RoleMenu
          currentUserName={userName}
          currentRoleName={roleName}
          currentInitials={initials}
          demoUsers={demoUsers}
          onSwitchRole={onSwitchRole}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
