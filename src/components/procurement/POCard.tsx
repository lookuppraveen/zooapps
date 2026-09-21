"use client";

import { useState } from "react";
import { CheckCircle2, ShoppingCart, XCircle } from "lucide-react";
import type { POStatus } from "@prisma/client";
import { trpc } from "@/lib/trpc/react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComponentReuseChip } from "@/components/ui/ComponentReuseChip";
import { StatusChip } from "@/components/ui/StatusChip";
import { cn } from "@/lib/utils";

type Approval = {
  id: string;
  actorId: string;
  decision: string;
  decidedAt: Date;
};

type PO = {
  id: string;
  externalId: string | null;
  vendor: string;
  itemDescription: string;
  qty: number;
  unitCostCents: number;
  status: POStatus;
  createdAt: Date;
  approvals: Approval[];
};

type Props = {
  incidentCode: string;
  purchaseOrders: PO[];
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusFor(s: POStatus): "healthy" | "monitor" | "critical" {
  if (s === "approved" || s === "sent") return "healthy";
  if (s === "rejected") return "critical";
  return "monitor";
}

export function POCard({ incidentCode, purchaseOrders }: Props) {
  const utils = trpc.useUtils();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const approve = trpc.procurement.approve.useMutation({
    onSuccess: () => void utils.incidents.get.invalidate({ code: incidentCode }),
  });
  const reject = trpc.procurement.reject.useMutation({
    onSuccess: () => void utils.incidents.get.invalidate({ code: incidentCode }),
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <CardTitle>Procurement</CardTitle>
        </div>
        <ComponentReuseChip label="ProcureChain" />
      </CardHeader>
      <CardBody className="space-y-3">
        {purchaseOrders.length === 0 && (
          <p className="text-xs text-slate-500">
            No purchase orders drafted for this incident.
          </p>
        )}
        {purchaseOrders.map((po) => {
          const pending = po.status === "pending_approval" || po.status === "draft";
          return (
            <div
              key={po.id}
              className={cn(
                "rounded-lg border p-3",
                pending ? "border-status-monitor/30 bg-status-monitor/5" : "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-nav">
                      {po.externalId ?? po.id.slice(0, 8)}
                    </span>
                    <StatusChip status={statusFor(po.status)} label={po.status.replace("_", " ")} />
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{po.itemDescription}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>Vendor: <span className="text-slate-700">{po.vendor}</span></span>
                    <span>Qty: <span className="text-slate-700">{po.qty}</span></span>
                    <span>Unit: <span className="text-slate-700">{money(po.unitCostCents)}</span></span>
                    <span>Total: <span className="font-semibold text-slate-900">{money(po.qty * po.unitCostCents)}</span></span>
                  </div>
                  {po.approvals.length > 0 && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {po.approvals.length} approval action(s) on record
                    </p>
                  )}
                </div>
              </div>

              {pending && (
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/60 pt-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    placeholder="Reason (required to reject)"
                    aria-label="Rejection reason"
                    value={rejectReason[po.id] ?? ""}
                    onChange={(e) =>
                      setRejectReason((r) => ({ ...r, [po.id]: e.target.value }))
                    }
                    className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => approve.mutate({ poId: po.id })}
                      className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={
                        approve.isPending ||
                        reject.isPending ||
                        !(rejectReason[po.id] ?? "").trim()
                      }
                      onClick={() =>
                        reject.mutate({ poId: po.id, reason: rejectReason[po.id] })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-status-critical/40 px-3 py-1.5 text-xs font-medium text-status-critical hover:bg-status-critical/5 disabled:opacity-40"
                    >
                      <XCircle className="h-3 w-3" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
