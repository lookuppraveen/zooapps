"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { ChevronDown, LogOut, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoUser = { id: string; email: string; name: string; roleName: string };

type Props = {
  currentUserName: string;
  currentRoleName: string;
  currentInitials: string;
  demoUsers: DemoUser[];
  onSwitchRole: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function RoleMenu({
  currentUserName,
  currentRoleName,
  currentInitials,
  demoUsers,
  onSwitchRole,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-slate-200 py-1 pl-1 pr-2 transition-colors hover:border-slate-300"
        disabled={pending}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
          {currentInitials}
        </div>
        <div className="text-left text-xs leading-tight">
          <p className="font-medium text-slate-900">{currentRoleName}</p>
          <p className="text-slate-500">{currentUserName}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-72 rounded-card border border-slate-200 bg-white p-1 shadow-card-hover"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Switch role (demo)
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Signs you in as another seeded user to demonstrate RBAC scoping.
            </p>
          </div>
          <ul className="py-1">
            {demoUsers.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await onSwitchRole(u.email);
                      setOpen(false);
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 disabled:opacity-50",
                  )}
                >
                  <Repeat className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="flex-1 truncate">
                    <span className="font-medium text-slate-900">{u.roleName}</span>
                    <span className="ml-1 text-slate-500">· {u.name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 py-1">
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(async () => onSignOut())}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
