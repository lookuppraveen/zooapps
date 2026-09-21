"use client";

import { CheckCircle2, CircleAlert, CircleDashed, FileText, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";

function statusIcon(status: "pending" | "indexing" | "ready" | "failed") {
  if (status === "ready") return <CheckCircle2 className="h-3.5 w-3.5 text-status-healthy" aria-label="Indexed" />;
  if (status === "failed") return <CircleAlert className="h-3.5 w-3.5 text-status-critical" aria-label="Failed" />;
  return <CircleDashed className="h-3.5 w-3.5 text-status-monitor" aria-label={status} />;
}

export function CorpusRail() {
  const corpus = trpc.knowledge.corpus.useQuery(undefined, { staleTime: 60_000 });
  const mode = trpc.knowledge.mode.useQuery(undefined, { staleTime: 5 * 60_000 });
  const docs = corpus.data ?? [];
  const total = docs.reduce((s, d) => s + d.chunkCount, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <CardTitle>Grounded on</CardTitle>
          </div>
          <ComponentReuseChip label="OIP" />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Role-scoped indexed corpus. Adapter: {mode.data?.mode === "oip" ? "OIP" : "local (pending spec)"}.
        </p>
      </CardHeader>
      <CardBody className="flex-1 space-y-2 overflow-y-auto">
        {corpus.isLoading && <p className="text-xs text-slate-400">Loading corpus…</p>}
        {!corpus.isLoading && docs.length === 0 && (
          <p className="text-xs text-slate-500">
            No documents visible to your role. Run <code>pnpm corpus:ingest</code>.
          </p>
        )}
        {docs.map((d) => (
          <div key={d.documentId} className="rounded-lg border border-slate-100 p-2.5">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-nav">{d.title}</p>
                <p className="truncate text-[10px] text-slate-500">{d.source}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                  {statusIcon(d.indexStatus)}
                  <span>{d.chunkCount} chunks</span>
                  {d.indexedAt && (
                    <span className="text-slate-400">
                      · indexed {new Date(d.indexedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {docs.length > 0 && (
          <p className="pt-1 text-[10px] text-slate-400">Total: {total} indexed chunks</p>
        )}
      </CardBody>
    </Card>
  );
}
