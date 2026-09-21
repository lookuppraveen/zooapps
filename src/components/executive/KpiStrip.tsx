"use client";

import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function toneClasses(tone: string) {
  return tone === "critical"
    ? "text-status-critical"
    : tone === "monitor"
      ? "text-status-monitor"
      : tone === "healthy"
        ? "text-status-healthy"
        : "text-slate-nav";
}

export function ExecutiveKpiStrip() {
  const q = trpc.executive.kpis.useQuery(undefined, { refetchInterval: 15_000 });
  useZooEvents(() => q.refetch(), ["incident.updated", "incident.opened", "scenario.step"]);
  const kpis = q.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.key}>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={cn("mt-1 text-xl font-semibold tabular-nums", toneClasses(k.tone))}>
              {k.displayValue}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              {typeof k.deltaPct === "number" && k.deltaPct !== 0 && (
                <span
                  className={cn(
                    "rounded px-1 py-[1px] text-[10px] font-semibold",
                    k.deltaPct < 0 ? "bg-status-healthy/10 text-status-healthy" : "bg-status-critical/10 text-status-critical",
                  )}
                >
                  {k.deltaPct > 0 ? "▲" : "▼"} {Math.abs(k.deltaPct)}%
                </span>
              )}
              {k.hint && <p className="text-[11px] text-slate-500">{k.hint}</p>}
            </div>
          </CardBody>
        </Card>
      ))}
      {kpis.length === 0 && (
        <Card>
          <CardBody className="text-xs text-slate-400">Loading KPIs…</CardBody>
        </Card>
      )}
    </div>
  );
}
