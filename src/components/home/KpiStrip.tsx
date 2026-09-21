"use client";

import { Activity, Bell, Workflow, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type TileProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "critical" | "monitor" | "muted";
};

function KpiTile({ label, value, hint, icon: Icon, tone = "brand" }: TileProps) {
  const toneClasses =
    tone === "critical"
      ? "bg-status-critical/10 text-status-critical"
      : tone === "monitor"
        ? "bg-status-monitor/10 text-status-monitor"
        : tone === "muted"
          ? "bg-slate-100 text-slate-500"
          : "bg-brand/10 text-brand";
  return (
    <Card>
      <CardBody className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-nav">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneClasses)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </CardBody>
    </Card>
  );
}

export function KpiStrip() {
  const overview = trpc.portal.overview.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  // Any event of interest → refetch to pull fresh KPIs from the server.
  useZooEvents(
    () => overview.refetch(),
    ["alert.raised", "incident.opened", "incident.updated", "kpi.changed"],
  );

  const data = overview.data;
  const openAlerts = data?.openAlerts ?? 0;
  const active = data?.activeWorkflows ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        icon={Activity}
        label="Systems healthy"
        value={data ? `${data.systemsHealthy.value} / ${data.systemsHealthy.of}` : "…"}
        hint={data && data.systemsHealthy.value === data.systemsHealthy.of ? "All monitored assets nominal" : "Attention required"}
        tone={data && data.systemsHealthy.value === data.systemsHealthy.of ? "brand" : "critical"}
      />
      <KpiTile
        icon={Bell}
        label="Open alerts"
        value={openAlerts}
        hint={openAlerts === 0 ? "No unacknowledged alerts" : "Requires triage"}
        tone={openAlerts === 0 ? "muted" : "critical"}
      />
      <KpiTile
        icon={Workflow}
        label="Active workflows"
        value={active}
        hint={active === 0 ? "No incidents in flight" : "In response"}
        tone={active === 0 ? "muted" : "monitor"}
      />
      <KpiTile
        icon={MessageSquareText}
        label="Knowledge queries today"
        value={data?.knowledgeQueriesToday ?? 0}
        hint="Grounded answers served"
      />
    </div>
  );
}
