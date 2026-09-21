"use client";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  nominal: number;
  status: "healthy" | "monitor" | "critical";
};

/**
 * Compact horizontal band gauge — value + numeric readout, coloured band
 * showing the safe range, and a marker at the current value. No chart lib.
 *
 * Range derivation: if both `min` and `max` are provided, use those; if
 * only one, extend from the nominal by ±20% for visual context.
 */
export function Gauge({ label, value, unit, min, max, nominal, status }: Props) {
  const lo = min ?? nominal * 0.8;
  const hi = max ?? nominal * 1.2;
  const span = hi - lo;
  const clamped = Math.max(lo, Math.min(hi, value));
  const pos = ((clamped - lo) / span) * 100;

  // Safe band = [min|lo, max|hi] as percentages of the whole strip.
  const safeMinPct = min !== undefined ? ((min - lo) / span) * 100 : 0;
  const safeMaxPct = max !== undefined ? ((max - lo) / span) * 100 : 100;

  const color =
    status === "critical"
      ? "text-status-critical"
      : status === "monitor"
        ? "text-status-monitor"
        : "text-status-healthy";
  const bar =
    status === "critical"
      ? "bg-status-critical"
      : status === "monitor"
        ? "bg-status-monitor"
        : "bg-status-healthy";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={cn("font-mono text-lg font-semibold tabular-nums", color)}>
          {value.toFixed(1)}
          <span className="ml-0.5 text-xs text-slate-500">{unit}</span>
        </p>
      </div>

      <div className="relative h-2 rounded-full bg-slate-100">
        {/* safe band */}
        <div
          className="absolute inset-y-0 rounded-full bg-status-healthy/20"
          style={{
            left: `${safeMinPct}%`,
            width: `${Math.max(0, safeMaxPct - safeMinPct)}%`,
          }}
          aria-hidden="true"
        />
        {/* value marker */}
        <div
          className={cn("absolute -top-0.5 h-3 w-1 rounded-sm shadow-sm", bar)}
          style={{ left: `calc(${pos}% - 2px)` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>{lo.toFixed(1)}{unit}</span>
        <span>nominal {nominal}{unit}</span>
        <span>{hi.toFixed(1)}{unit}</span>
      </div>
    </div>
  );
}
