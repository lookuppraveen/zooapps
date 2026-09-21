"use client";

import { Activity, Filter } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function ago(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

function actionColor(action: string): string {
  if (action.startsWith("access.denied") || action.includes("rejected")) return "text-status-critical";
  if (action.startsWith("scenario.")) return "text-brand";
  if (action.includes("approved") || action.includes("completed")) return "text-status-healthy";
  if (action.includes("incident.opened") || action.includes("threshold.breach")) return "text-status-monitor";
  return "text-slate-600";
}

export function AuditTimeline() {
  const [filter, setFilter] = useState("");
  const q = trpc.security.audit.useQuery({ limit: 100 }, { refetchInterval: 20_000 });
  useZooEvents(() => q.refetch(), ["scenario.step", "incident.opened", "incident.updated", "alert.raised"]);

  const rows = (q.data ?? []).filter((r) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return (
      r.action.toLowerCase().includes(f) ||
      r.resourceType.toLowerCase().includes(f) ||
      (r.actorName ?? "").toLowerCase().includes(f)
    );
  });

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <CardTitle>Immutable audit trail</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="filter action / role / user"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </CardHeader>
      <CardBody className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">No events match your filter.</p>
        ) : (
          <ol className="relative space-y-2 border-l border-slate-200 pl-3">
            {rows.map((r) => (
              <li key={r.id} className="relative">
                <span
                  className="absolute -left-[7px] top-2 h-2 w-2 rounded-full bg-brand"
                  aria-hidden="true"
                />
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("text-xs font-medium", actionColor(r.action))}>
                    {r.action}
                  </p>
                  <span className="text-[10px] text-slate-400">{ago(r.occurredAt)}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {r.actorName ? (
                    <>
                      <span className="text-slate-700">{r.actorName}</span>
                      {r.actorRole && <span> · {r.actorRole}</span>}
                      <span className="mx-1">→</span>
                    </>
                  ) : (
                    <>
                      <span className="italic text-slate-400">system</span>
                      <span className="mx-1">→</span>
                    </>
                  )}
                  <span>{r.resourceType}</span>
                  {r.resourceId && <span className="ml-1 text-slate-400">{r.resourceId.slice(0, 8)}…</span>}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
