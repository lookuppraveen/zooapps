"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { SourcedSummary } from "@/server/clients/dashboard/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { SourcedSummaryCard } from "./SummaryCard";

export function AskData() {
  const suggestions = trpc.executive.suggestions.useQuery();
  const mode = trpc.executive.mode.useQuery(undefined, { staleTime: 5 * 60_000 });
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<SourcedSummary | null>(null);
  const [answerMode, setAnswerMode] = useState<"local" | "dashboard" | null>(null);
  const ask = trpc.executive.ask.useMutation();

  async function send(q: string) {
    const question = q.trim();
    if (!question || ask.isPending) return;
    const res = await ask.mutateAsync({ question });
    setAnswer(res.answer);
    setAnswerMode(res.mode);
    setInput("");
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <CardTitle>Ask the data</CardTitle>
          </div>
          <ComponentReuseChip label="Dashboard capability" />
        </CardHeader>
        <CardBody className="space-y-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={ask.isPending}
              placeholder="e.g. What's our downtime saved this month?"
              aria-label="Ask a question"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={ask.isPending || input.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Ask
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Try</span>
            {(suggestions.data ?? []).map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={ask.isPending}
                onClick={() => void send(s.question)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 hover:border-brand/40 hover:bg-brand/5 hover:text-brand disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
            {mode.data && (
              <span className="ml-auto text-[10px] text-slate-400">
                adapter: {mode.data.mode}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {ask.isPending && (
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
            </span>
            Querying data & sourcing…
          </div>
        </div>
      )}

      {answer && !ask.isPending && (
        <SourcedSummaryCard summary={answer} eyebrow={`Sourced answer · ${answerMode ?? ""}`} />
      )}
    </div>
  );
}
