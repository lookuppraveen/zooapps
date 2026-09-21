"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";

export function Watchlist({ activeCode }: { activeCode?: string }) {
  const q = trpc.facilities.assets.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  useZooEvents(() => q.refetch(), ["asset.status", "telemetry.tick"]);

  const assets = q.data ?? [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <CardTitle>Asset watchlist</CardTitle>
        </div>
        <span className="text-[11px] text-slate-500">{assets.length} monitored</span>
      </CardHeader>
      <CardBody className="flex-1 space-y-1.5">
        {assets.length === 0 && (
          <p className="text-xs text-slate-500">No assets registered.</p>
        )}
        {assets.map((a) => (
          <Link
            key={a.id}
            href={`/facilities/${a.code}` as never}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
              activeCode === a.code
                ? "border-brand/40 bg-brand/5"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-nav">
                  {a.code}
                </span>
                <StatusChip status={a.healthStatus} pulse={a.healthStatus !== "healthy"} />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-600">{a.name}</p>
              <p className="truncate text-[10px] text-slate-400">{a.habitatName}</p>
            </div>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}
