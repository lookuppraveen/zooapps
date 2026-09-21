import { cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/Card";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";

type Props = {
  step: string;
  reuses?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PlaceholderPanel({ step, reuses, children, className }: Props) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardBody className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            {step}
          </span>
          {reuses && <ComponentReuseChip label={reuses} />}
        </div>
        <div className="text-sm text-slate-600">
          {children ?? "This module is scaffolded — content ships in the next steps."}
        </div>
      </CardBody>
    </Card>
  );
}
