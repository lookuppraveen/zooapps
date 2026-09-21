"use client";

import { FileText, Sparkles } from "lucide-react";
import type { SourcedSummary } from "@/server/clients/dashboard/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

type Props = {
  summary: SourcedSummary;
  eyebrow?: string;
};

export function SourcedSummaryCard({ summary, eyebrow }: Props) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2 bg-brand/5">
        <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">{eyebrow}</p>
          )}
          <CardTitle className="truncate">{summary.headline}</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {summary.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-slate-100 bg-white p-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {m.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-nav">{m.value}</p>
                {m.delta && (
                  <p className="text-[10px] text-status-healthy">{m.delta}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {summary.bullets.length > 0 && (
          <ul className="space-y-1.5 text-sm text-slate-700">
            {summary.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {summary.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Sources:</span>
            {summary.sources.map((s) => (
              <span
                key={`${s.type}:${s.ref}`}
                title={s.description}
                className="inline-flex items-center gap-1 rounded-md border border-action/30 bg-action/5 px-1.5 py-0.5 text-[10px] font-medium text-action"
              >
                <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                {s.type}:{s.ref}
              </span>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
