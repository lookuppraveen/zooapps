"use client";

import { AlertTriangle, CircleDot, ArrowRight } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export function AlertFeed() {
  const alerts = trpc.portal.recentAlerts.useQuery({ limit: 8 }, {
    refetchInterval: 30_000,
  });

  useZooEvents(() => alerts.refetch(), ["alert.raised"]);

  const list = alerts.data ?? [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDot
            className={cn(
              "h-3.5 w-3.5",
              list.length > 0 ? "animate-pulse text-status-critical" : "text-slate-300",
            )}
            aria-hidden="true"
          />
          <CardTitle>Live alert feed</CardTitle>
        </div>
        <Link href={"/facilities" as never} className="inline-flex items-center gap-1 text-[11px] font-medium text-action hover:underline">
          Facilities <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardBody
        className="flex-1 space-y-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {list.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-slate-600">No active alerts</p>
            <p className="text-[11px] text-slate-400">
              Use “Run scenario” to trigger the connected LSS-204 story.
            </p>
          </div>
        ) : (
          list.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-lg border px-3 py-2",
                a.severity === "critical"
                  ? "border-status-critical/30 bg-status-critical/5"
                  : "border-status-monitor/30 bg-status-monitor/5",
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    a.severity === "critical" ? "text-status-critical" : "text-status-monitor",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-nav">
                      {a.assetCode}
                    </span>
                    <span className="text-[10px] text-slate-500">{timeAgo(a.raisedAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-700">{a.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
