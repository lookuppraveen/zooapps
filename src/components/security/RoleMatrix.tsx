"use client";

import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  home: "Home",
  knowledge: "Knowledge",
  facilities: "Facilities",
  executive: "Executive",
  incidents: "Incidents",
  security: "Security",
};

function cellLabel(canRead: boolean, canAct: boolean): string {
  if (canAct) return "RW";
  if (canRead) return "R";
  return "—";
}

function cellTone(canRead: boolean, canAct: boolean): string {
  if (canAct) return "bg-status-healthy/15 text-status-healthy";
  if (canRead) return "bg-brand/10 text-brand";
  return "bg-slate-100 text-slate-400";
}

export function RoleMatrix() {
  const q = trpc.security.matrix.useQuery(undefined, { staleTime: 60_000 });
  const data = q.data;

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        <CardTitle>Role × module access</CardTitle>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        {!data ? (
          <p className="text-xs text-slate-400">Loading matrix…</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Role</th>
                {data.modules.map((m) => (
                  <th key={m} className="py-1.5 px-2 text-center font-medium">
                    {MODULE_LABELS[m] ?? m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.roles.map((r) => (
                <tr key={r.key} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-nav">{r.name}</td>
                  {data.modules.map((m) => {
                    const c = data.cells[r.key][m];
                    return (
                      <td key={m} className="py-2 px-1 text-center">
                        <span
                          className={cn(
                            "inline-flex min-w-8 justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                            cellTone(c.canRead, c.canAct),
                          )}
                          title={
                            c.canAct
                              ? "Read + act"
                              : c.canRead
                                ? "Read only"
                                : "No access"
                          }
                        >
                          {cellLabel(c.canRead, c.canAct)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[10px] text-slate-500">
          <span className="mr-3">
            <span className="mr-1 rounded bg-brand/10 px-1.5 py-0.5 text-brand">R</span>
            read only
          </span>
          <span className="mr-3">
            <span className="mr-1 rounded bg-status-healthy/15 px-1.5 py-0.5 text-status-healthy">RW</span>
            read + act
          </span>
          <span>
            <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-400">—</span>
            no access
          </span>
        </p>
      </CardBody>
    </Card>
  );
}
