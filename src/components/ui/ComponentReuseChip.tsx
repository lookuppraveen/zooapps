import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  className?: string;
};

export function ComponentReuseChip({ label, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action",
        className,
      )}
      title={`Reuses ${label}`}
    >
      <Layers className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
