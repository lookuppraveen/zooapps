"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ModuleKey } from "@prisma/client";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { ConnectionStatus } from "./ConnectionStatus";

type SidebarProps = {
  visibleModules: ModuleKey[];
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useLiveBadges(): Partial<Record<ModuleKey, number>> {
  const overview = trpc.portal.overview.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  useZooEvents(
    () => overview.refetch(),
    ["alert.raised", "incident.opened", "incident.updated"],
  );
  const open = overview.data?.openAlerts ?? 0;
  const active = overview.data?.activeWorkflows ?? 0;
  return {
    home: open,
    incidents: open + active,
  };
}

export function Sidebar({ visibleModules }: SidebarProps) {
  const pathname = usePathname();
  const visible = new Set(visibleModules);
  const badges = useLiveBadges();

  return (
    <aside
      aria-label="Primary navigation"
      className="flex h-full w-64 shrink-0 flex-col bg-slate-nav text-slate-100"
    >
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-base font-bold text-white">
          Z
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-wider text-slate-400">
            St. Louis Zoo
          </p>
          <p className="truncate text-sm font-semibold text-white">Zoo AI · Ops Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Modules">
        <ul className="space-y-1">
          {MODULES.filter((m) => visible.has(m.key)).map((m) => {
            const active = isActive(pathname, m.href);
            const Icon = m.icon;
            const badge = badges[m.key];
            return (
              <li key={m.key}>
                <Link
                  href={m.href as never}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-brand-light" : "text-slate-400 group-hover:text-slate-200",
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{m.short}</span>
                  {typeof badge === "number" && badge > 0 && (
                    <span
                      className="rounded-full bg-status-critical px-1.5 text-[10px] font-semibold leading-4 text-white"
                      aria-label={`${badge} pending`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ConnectionStatus />
    </aside>
  );
}
