import { cn } from "@/lib/utils";

type Status = "healthy" | "monitor" | "critical";

type Props = {
  status: Status;
  label?: string;
  className?: string;
  pulse?: boolean;
};

const CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  healthy: {
    label: "Healthy",
    dot: "bg-status-healthy",
    bg: "bg-status-healthy/10",
    text: "text-status-healthy",
  },
  monitor: {
    label: "Monitor",
    dot: "bg-status-monitor",
    bg: "bg-status-monitor/10",
    text: "text-status-monitor",
  },
  critical: {
    label: "Critical",
    dot: "bg-status-critical",
    bg: "bg-status-critical/10",
    text: "text-status-critical",
  },
};

export function StatusChip({ status, label, className, pulse }: Props) {
  const c = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot, pulse && "animate-pulse")} />
      {label ?? c.label}
    </span>
  );
}
