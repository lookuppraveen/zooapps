"use client";

import { ChevronLeft, ChevronRight, User } from "lucide-react";
import type { KanbanColumn } from "@prisma/client";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  column: KanbanColumn;
  order: number;
  aiGenerated: boolean;
  completedAt: Date | null;
};

type Props = {
  incidentCode: string;
  tasks: Task[];
};

const COLUMNS: Array<{ key: KanbanColumn; label: string; tone: string }> = [
  { key: "todo", label: "To do", tone: "bg-slate-100 text-slate-600" },
  { key: "in_progress", label: "In progress", tone: "bg-brand/10 text-brand" },
  { key: "review", label: "Review", tone: "bg-status-monitor/10 text-status-monitor" },
  { key: "done", label: "Done", tone: "bg-status-healthy/10 text-status-healthy" },
];

const ORDER: KanbanColumn[] = ["todo", "in_progress", "review", "done"];

function prev(col: KanbanColumn): KanbanColumn | null {
  const i = ORDER.indexOf(col);
  return i > 0 ? ORDER[i - 1]! : null;
}
function next(col: KanbanColumn): KanbanColumn | null {
  const i = ORDER.indexOf(col);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1]! : null;
}

export function Kanban({ incidentCode, tasks }: Props) {
  const utils = trpc.useUtils();
  const move = trpc.incidents.moveTask.useMutation({
    onSuccess: () => {
      void utils.incidents.get.invalidate({ code: incidentCode });
    },
  });

  const grouped = new Map<KanbanColumn, Task[]>();
  for (const c of ORDER) grouped.set(c, []);
  for (const t of tasks) grouped.get(t.column)!.push(t);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = grouped.get(col.key)!;
        return (
          <div key={col.key} className="rounded-card border border-slate-200 bg-slate-50/50 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  col.tone,
                )}
              >
                {col.label}
              </span>
              <span className="text-[11px] text-slate-500">{items.length}</span>
            </div>
            <ul className="space-y-2 min-h-16">
              {items.map((t) => {
                const p = prev(t.column);
                const n = next(t.column);
                return (
                  <li
                    key={t.id}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-card"
                  >
                    <p className="text-xs text-slate-800">{t.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                        {t.aiGenerated ? (
                          <span className="rounded bg-brand/10 px-1.5 py-0.5 text-brand">AI</span>
                        ) : (
                          <User className="h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!p || move.isPending}
                          onClick={() =>
                            p && move.mutate({ taskId: t.id, toColumn: p })
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          aria-label="Move back"
                        >
                          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={!n || move.isPending}
                          onClick={() =>
                            n && move.mutate({ taskId: t.id, toColumn: n })
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          aria-label="Move forward"
                        >
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400">
                  Empty
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
