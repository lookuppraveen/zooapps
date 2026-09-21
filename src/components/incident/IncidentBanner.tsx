import { AlertOctagon } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";

type Props = {
  code: string;
  assetCode: string;
  priority: "low" | "medium" | "high" | "critical";
  summary: string | null;
};

export function IncidentBanner({ code, assetCode, priority, summary }: Props) {
  const critical = priority === "critical";
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-card border px-4 py-3 shadow-card ${
        critical
          ? "border-status-critical/30 bg-status-critical/5"
          : "border-status-monitor/30 bg-status-monitor/5"
      }`}
    >
      <AlertOctagon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          critical ? "text-status-critical" : "text-status-monitor"
        }`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-nav">{code}</span>
          <span className="text-xs text-slate-500">· {assetCode}</span>
          <StatusChip status={critical ? "critical" : "monitor"} label={priority} pulse={critical} />
        </div>
        {summary && <p className="mt-1 text-sm text-slate-700">{summary}</p>}
      </div>
    </div>
  );
}
