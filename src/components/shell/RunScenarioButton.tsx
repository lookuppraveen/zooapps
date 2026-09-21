"use client";

import { Play, RotateCcw, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { cn } from "@/lib/utils";

export function RunScenarioButton() {
  const state = trpc.scenario.state.useQuery(undefined, {
    refetchInterval: 5_000,
  });
  useZooEvents(() => state.refetch(), ["scenario.step"]);

  const utils = trpc.useUtils();
  const start = trpc.scenario.start.useMutation({
    onSuccess: () => {
      void utils.scenario.state.invalidate();
      void utils.portal.overview.invalidate();
    },
  });
  const reset = trpc.scenario.reset.useMutation({
    onSuccess: () => {
      void utils.scenario.state.invalidate();
      void utils.portal.overview.invalidate();
      void utils.portal.recentAlerts.invalidate();
      void utils.facilities.assets.invalidate();
      void utils.incidents.list.invalidate();
    },
  });

  const running = state.data?.state === "running";
  const complete = state.data?.state === "complete";
  const busy = start.isPending || reset.isPending || running;

  if (complete) {
    return (
      <button
        type="button"
        onClick={() => reset.mutate()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-card transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Reset connected scenario"
      >
        <RotateCcw className={cn("h-3.5 w-3.5", reset.isPending && "animate-spin")} aria-hidden="true" />
        <span>Reset scenario</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => start.mutate()}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Run connected scenario"
    >
      {running || start.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Play className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{running ? "Running…" : "Run scenario"}</span>
    </button>
  );
}
