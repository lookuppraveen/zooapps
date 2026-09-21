"use client";

import { Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

type Props = {
  onPick: (question: string) => void;
  disabled?: boolean;
};

export function SuggestionChips({ onPick, disabled }: Props) {
  const q = trpc.knowledge.suggestions.useQuery();
  const list = q.data ?? [];
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Try
      </span>
      {list.map((s) => (
        <button
          key={s.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s.question)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand disabled:opacity-50"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
