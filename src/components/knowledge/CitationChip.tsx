"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/server/clients/knowledge/types";

type Props = {
  index: number;
  citation: Citation;
};

/**
 * Numbered citation chip. Click reveals a small popover with the source
 * snippet — proves every claim traces back to a real document row.
 */
export function CitationChip({ index, citation }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-action/30 bg-action/5 px-1.5 py-0.5 text-[10px] font-semibold text-action transition-colors hover:bg-action/10",
        )}
        aria-expanded={open}
        aria-label={`Citation ${index + 1}: ${citation.documentTitle} — ${citation.section}`}
      >
        <FileText className="h-2.5 w-2.5" aria-hidden="true" />
        {index + 1}
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-20 mt-1 w-80 rounded-card border border-slate-200 bg-white p-3 text-left shadow-card-hover"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-nav">
                {citation.documentTitle}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                {citation.section}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Close citation"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-snug text-slate-700">
            {citation.snippet}
          </p>
          <p className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
            chunk {citation.chunkId.slice(0, 8)}…
          </p>
        </div>
      )}
    </span>
  );
}
