import { FileText, GitBranch } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";

type Citation = { chunkId: string; documentTitle: string; section: string };
type Step = { id: string; ordinal: number; text: string; citationIds: unknown };

function parseCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Citation => !!r && typeof r === "object" && "chunkId" in r)
    .map((r) => ({
      chunkId: String(r.chunkId),
      documentTitle: String(r.documentTitle),
      section: String(r.section),
    }));
}

export function PlanTimeline({ steps }: { steps: Step[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <CardTitle>AI response plan</CardTitle>
        </div>
        <ComponentReuseChip label="Agent Builder" />
      </CardHeader>
      <CardBody>
        {steps.length === 0 ? (
          <p className="text-xs text-slate-500">No plan steps generated.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {steps.map((s) => {
              const cites = parseCitations(s.citationIds);
              return (
                <li key={s.id} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-brand bg-white text-[10px] font-semibold text-brand"
                    aria-hidden="true"
                  >
                    {s.ordinal + 1}
                  </span>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                    {s.text}
                  </p>
                  {cites.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {cites.map((c) => (
                        <span
                          key={c.chunkId}
                          title={`${c.documentTitle} — ${c.section}`}
                          className="inline-flex items-center gap-1 rounded-md border border-action/30 bg-action/5 px-1.5 py-0.5 text-[10px] font-medium text-action"
                        >
                          <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                          {c.section}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
