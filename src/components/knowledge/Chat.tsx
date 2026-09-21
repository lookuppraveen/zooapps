"use client";

import { useEffect, useRef, useState } from "react";
import { Send, User } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { Answer } from "@/server/clients/knowledge/types";
import { GroundedAnswerCard } from "./GroundedAnswerCard";
import { SuggestionChips } from "./SuggestionChips";

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; answer: Answer; mode: "oip" | "local"; cached: boolean }
  | { id: string; role: "assistant"; error: string };

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const ask = trpc.knowledge.ask.useMutation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, ask.isPending]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || ask.isPending) return;
    const userId = crypto.randomUUID();
    setTurns((t) => [...t, { id: userId, role: "user", text: q }]);
    setInput("");
    try {
      const res = await ask.mutateAsync({ question: q });
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer: res.answer,
          mode: res.mode,
          cached: res.cached,
        },
      ]);
    } catch (e) {
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          error: e instanceof Error ? e.message : "Request failed",
        },
      ]);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-slate-200 bg-surface-card shadow-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              💬
            </div>
            <p className="text-sm text-slate-700">Ask about SOPs, assets, policies or incidents.</p>
            <p className="max-w-md text-xs text-slate-500">
              Every answer is grounded in the indexed corpus and returns verifiable citations.
              Role-scoped — you only see documents your role can access.
            </p>
          </div>
        )}

        {turns.map((t) => {
          if (t.role === "user") {
            return (
              <div key={t.id} className="flex justify-end gap-2">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand px-4 py-2 text-sm text-white shadow-card">
                  {t.text}
                </div>
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
            );
          }
          if ("error" in t) {
            return (
              <div key={t.id} className="rounded-card border border-status-critical/30 bg-status-critical/5 px-4 py-3 text-xs text-status-critical">
                {t.error}
              </div>
            );
          }
          return <GroundedAnswerCard key={t.id} answer={t.answer} mode={t.mode} />;
        })}

        {ask.isPending && (
          <div className="rounded-card border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
              </span>
              Retrieving passages and grounding answer…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="mb-2">
          <SuggestionChips onPick={(q) => void send(q)} disabled={ask.isPending} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about procedures, assets, policies…"
            aria-label="Ask a question"
            disabled={ask.isPending}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={ask.isPending || input.trim().length < 3}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
