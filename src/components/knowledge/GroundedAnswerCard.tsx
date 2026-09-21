"use client";

import { BookOpen, ShieldCheck } from "lucide-react";
import type { Answer } from "@/server/clients/knowledge/types";
import { CitationChip } from "./CitationChip";

type Props = {
  answer: Answer;
  mode: "oip" | "local";
};

export function GroundedAnswerCard({ answer, mode }: Props) {
  const grounded = answer.citations.length > 0;

  return (
    <div className="rounded-card border border-slate-200 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-brand/5 px-4 py-2">
        <BookOpen className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">
          Grounded answer
        </span>
        {typeof answer.confidence === "number" && (
          <span className="text-[10px] text-slate-500">
            · confidence {(answer.confidence * 100).toFixed(0)}%
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {mode === "oip" ? "OIP" : "local corpus"}
        </span>
      </div>

      <div className="px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {answer.answer}
        </p>

        {grounded ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Sources:</span>
            {answer.citations.map((c, i) => (
              <CitationChip key={c.chunkId} index={i} citation={c} />
            ))}
          </div>
        ) : (
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] italic text-status-monitor">
            No citations — this response is not grounded in the corpus.
          </p>
        )}
      </div>
    </div>
  );
}
