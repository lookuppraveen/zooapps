"use client";

import { ArrowRight, Clock, Wrench, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SensorMetric } from "@prisma/client";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Gauge } from "./Gauge";

type Props = { code: string };

const METRIC_LABEL: Record<SensorMetric, string> = {
  dissolved_oxygen: "Dissolved O₂",
  pressure: "Pump pressure",
  temperature: "Temperature",
};

function evaluateStatus(
  value: number,
  min?: number,
  max?: number,
): "healthy" | "monitor" | "critical" {
  if (min !== undefined && value < min) return "critical";
  if (max !== undefined && value > max) return "critical";
  if (min !== undefined && value < min * 1.1) return "monitor";
  if (max !== undefined && value > max * 0.9) return "monitor";
  return "healthy";
}

function shortDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AssetFocusCard({ code }: Props) {
  const router = useRouter();
  const q = trpc.facilities.asset.useQuery({ code }, { refetchInterval: 15_000 });
  useZooEvents(
    (e) => {
      if ("assetCode" in e && e.assetCode === code) void q.refetch();
    },
    ["telemetry.tick", "asset.status"],
  );
  const openIncident = trpc.incidents.openFromAlert.useMutation({
    onSuccess: (r) => router.push(`/incidents/${r.incidentCode}` as never),
  });

  if (q.isLoading) {
    return (
      <Card>
        <CardBody className="h-64 animate-pulse text-sm text-slate-400">Loading asset…</CardBody>
      </Card>
    );
  }
  if (!q.data) {
    return (
      <Card>
        <CardBody className="text-sm text-slate-500">Asset {code} not found.</CardBody>
      </Card>
    );
  }

  const { asset, readings, maintenance } = q.data;
  const thresholds = asset.thresholds;

  const metrics: SensorMetric[] = ["dissolved_oxygen", "pressure", "temperature"];

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{asset.code} · {asset.name}</CardTitle>
            <StatusChip status={asset.healthStatus} pulse={asset.healthStatus !== "healthy"} />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {asset.category} · {asset.habitatName}
          </p>
        </div>
        <button
          type="button"
          disabled={asset.healthStatus === "healthy" || openIncident.isPending}
          onClick={() =>
            openIncident.mutate({
              assetCode: asset.code,
              severity: asset.healthStatus === "critical" ? "critical" : "warning",
              message:
                asset.healthStatus === "critical"
                  ? `${asset.name} in critical state — manual handoff by operator`
                  : `${asset.name} showing degraded readings — manual handoff by operator`,
            })
          }
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          title={
            asset.healthStatus === "healthy"
              ? "Only available when the asset is in monitor or critical state"
              : "Open an incident from this alert"
          }
        >
          <Zap className="h-3 w-3" aria-hidden="true" />
          {openIncident.isPending ? "Opening…" : "Hand off to Incident"}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map((m) => {
            const t = thresholds[m];
            const reading = readings.find((r) => r.metric === m);
            if (!t) return null;
            const value = reading?.value ?? t.nominal;
            const unit = reading?.unit ?? t.unit;
            const status = reading ? evaluateStatus(value, t.min, t.max) : "healthy";
            return (
              <Gauge
                key={m}
                label={METRIC_LABEL[m]}
                value={value}
                unit={unit}
                min={t.min}
                max={t.max}
                nominal={t.nominal}
                status={status}
              />
            );
          })}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Maintenance history
            </h3>
          </div>
          {maintenance.length === 0 ? (
            <p className="text-xs text-slate-500">No maintenance records.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 pr-2 font-medium">Date</th>
                  <th className="py-1.5 pr-2 font-medium">Action</th>
                  <th className="py-1.5 pr-2 font-medium">Technician</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 align-top text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {shortDate(m.performedAt)}
                      </span>
                    </td>
                    <td className="py-2 pr-2 align-top text-slate-800">{m.action}</td>
                    <td className="py-2 pr-2 align-top text-slate-500">
                      {m.technician?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
