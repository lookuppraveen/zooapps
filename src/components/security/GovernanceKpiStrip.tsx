"use client";

import { FlaskConical, KeyRound, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";

type Tile = { icon: LucideIcon; label: string; value: React.ReactNode; hint?: string };

export function GovernanceKpiStrip() {
  const q = trpc.security.kpis.useQuery(undefined, { refetchInterval: 30_000 });
  const data = q.data;

  const tiles: Tile[] = [
    {
      icon: ShieldCheck,
      label: "Identity",
      value: (
        <span className="inline-flex items-center gap-1.5">
          SSO
          <StatusChip status={data?.ssoMfa ? "healthy" : "critical"} label="MFA" />
        </span>
      ),
      hint: "Simulated for demo (D4)",
    },
    { icon: Users, label: "Roles / users", value: data ? `${data.roles} / ${data.users}` : "…", hint: "6-role matrix" },
    { icon: KeyRound, label: "Audit events", value: data ? data.auditEvents.toLocaleString() : "…", hint: `${data?.aiInteractions ?? 0} AI actions` },
    { icon: FlaskConical, label: "Data classification", value: data?.dataClassification ?? "…", hint: "Banner enforced" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardBody className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-nav">{t.value}</p>
              {t.hint && <p className="mt-0.5 text-[11px] text-slate-500">{t.hint}</p>}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <t.icon className="h-4 w-4" aria-hidden="true" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
