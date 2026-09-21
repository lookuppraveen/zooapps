"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, X } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/react";
import { useZooEvents } from "@/hooks/useZooEvents";
import { cn } from "@/lib/utils";

type Snapshot = {
  state: "idle" | "running" | "complete" | "failed";
  step: number;
  label: string;
  incidentCode: string | null;
  error: string | null;
};

/**
 * Overlay stepper that tracks the connected-scenario run. Pinned to the
 * top of the shell while the scenario is running or has just completed.
 * Auto-dismisses ~10s after completion; user can dismiss immediately.
 */
export function ScenarioStepper() {
  const state = trpc.scenario.state.useQuery(undefined, {
    refetchInterval: 3_000,
  });
  const steps = trpc.scenario.steps.useQuery(undefined, { staleTime: 60_000 });
  const [dismissed, setDismissed] = useState(false);

  // SSE step events drive UI updates faster than polling
  useZooEvents(() => state.refetch(), ["scenario.step"]);

  // Reset dismissal when a new run starts
  useEffect(() => {
    if (state.data?.state === "running") setDismissed(false);
  }, [state.data?.state]);

  // Auto-dismiss ~10s after completion
  useEffect(() => {
    if (state.data?.state === "complete") {
      const t = setTimeout(() => setDismissed(true), 10_000);
      return () => clearTimeout(t);
    }
  }, [state.data?.state]);

  if (!state.data || !steps.data) return null;
  const s = state.data as Snapshot;
  if (s.state === "idle" || dismissed) return null;

  const items = steps.data;

  return (
    <div className="border-b border-slate-200 bg-white shadow-card">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-2">
          {s.state === "running" && <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />}
          {s.state === "complete" && <CheckCircle2 className="h-4 w-4 text-status-healthy" aria-hidden="true" />}
          {s.state === "failed" && <CircleAlert className="h-4 w-4 text-status-critical" aria-hidden="true" />}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-nav">
            Connected scenario
          </p>
        </div>

        <ol className="hidden flex-1 items-center gap-1.5 sm:flex">
          {items.map((it, idx) => {
            const done = s.step > it.n || s.state === "complete";
            const active = s.step === it.n && s.state === "running";
            return (
              <li key={it.n} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                    done
                      ? "bg-status-healthy text-white"
                      : active
                        ? "bg-brand text-white"
                        : "bg-slate-100 text-slate-400",
                  )}
                  title={it.label}
                >
                  {done ? "✓" : it.n}
                </div>
                {idx < items.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-6 rounded-full transition-colors",
                      done ? "bg-status-healthy" : "bg-slate-200",
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>

        <div className="min-w-0 flex-1 sm:flex-none sm:text-right">
          <p className="truncate text-xs text-slate-700">
            <span className="font-medium">Step {s.step} of {items.length - 1}:</span> {s.label}
          </p>
          {s.state === "complete" && s.incidentCode && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Opened{" "}
              <Link
                href={`/incidents/${s.incidentCode}` as never}
                className="font-medium text-action hover:underline"
              >
                {s.incidentCode}
              </Link>
              {" · "}
              <Link href={"/executive" as never} className="font-medium text-action hover:underline">
                view summary
              </Link>
            </p>
          )}
          {s.state === "failed" && s.error && (
            <p className="mt-0.5 text-[11px] text-status-critical">{s.error}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Dismiss scenario stepper"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
