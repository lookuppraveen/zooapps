import Link from "next/link";
import type { ModuleKey } from "@prisma/client";
import { MODULES } from "@/lib/modules";

export function ModuleLaunchpad({ visible }: { visible: ModuleKey[] }) {
  const set = new Set(visible);
  const modules = MODULES.filter((m) => m.key !== "home" && set.has(m.key));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {modules.map((m) => {
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            href={m.href as never}
            className="group rounded-card border border-slate-200 bg-surface-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand/15">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-nav">{m.label}</p>
                <p className="mt-0.5 text-xs text-slate-600">{m.description}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
