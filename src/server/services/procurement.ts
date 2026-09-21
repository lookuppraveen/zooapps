import type { RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import { bus } from "@/server/realtime/sse";
import { createProcurementClient } from "@/server/clients/procurement";
import { appendAuditEvent } from "./audit";

/**
 * Draft a purchase order via ProcureChain and mirror the state locally
 * (we keep a row so the incident detail page can render without a
 * ProcureChain round-trip on every load).
 */
export async function draftPurchaseOrder(input: {
  incidentId: string;
  incidentCode: string;
  vendor: string;
  itemDescription: string;
  qty: number;
  unitCostCents: number;
  actor: { id: string; role: RoleKey };
}) {
  const client = createProcurementClient(input.actor);
  const remote = await client.draftPO({
    vendor: input.vendor,
    itemDescription: input.itemDescription,
    qty: input.qty,
    unitCostCents: input.unitCostCents,
    incidentCode: input.incidentCode,
    requestedById: input.actor.id,
  });

  const po = await db.purchaseOrder.create({
    data: {
      incidentId: input.incidentId,
      vendor: remote.vendor,
      itemDescription: remote.itemDescription,
      qty: remote.qty,
      unitCostCents: remote.unitCostCents,
      status: remote.status,
      externalId: remote.externalId,
    },
  });

  void appendAuditEvent({
    actorId: input.actor.id,
    actorRole: input.actor.role,
    action: "procurement.drafted",
    resourceType: "purchase_order",
    resourceId: po.id,
    meta: {
      externalId: remote.externalId,
      vendor: remote.vendor,
      unitCostCents: remote.unitCostCents,
      incidentCode: input.incidentCode,
    },
  });

  bus.publish({
    kind: "incident.updated",
    incidentCode: input.incidentCode,
    at: new Date().toISOString(),
  });

  return po;
}

export async function approvePurchaseOrder(input: {
  poId: string;
  actor: { id: string; role: RoleKey };
}) {
  const existing = await db.purchaseOrder.findUnique({
    where: { id: input.poId },
    include: { incident: { select: { code: true } } },
  });
  if (!existing) throw new Error("PO not found");
  if (!existing.externalId) throw new Error("PO has no external id");
  if (existing.status !== "pending_approval" && existing.status !== "draft") {
    throw new Error(`PO already ${existing.status}`);
  }

  const client = createProcurementClient(input.actor);
  const remote = await client.approvePO({
    externalId: existing.externalId,
    approverId: input.actor.id,
  });

  const [po] = await db.$transaction([
    db.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: remote.status },
    }),
    db.pOApproval.create({
      data: { poId: existing.id, actorId: input.actor.id, decision: "approved" },
    }),
  ]);

  void appendAuditEvent({
    actorId: input.actor.id,
    actorRole: input.actor.role,
    action: "procurement.approved",
    resourceType: "purchase_order",
    resourceId: po.id,
    meta: { externalId: existing.externalId },
  });

  if (existing.incident) {
    bus.publish({
      kind: "incident.updated",
      incidentCode: existing.incident.code,
      at: new Date().toISOString(),
    });
  }

  return po;
}

export async function rejectPurchaseOrder(input: {
  poId: string;
  reason?: string;
  actor: { id: string; role: RoleKey };
}) {
  const existing = await db.purchaseOrder.findUnique({
    where: { id: input.poId },
    include: { incident: { select: { code: true } } },
  });
  if (!existing) throw new Error("PO not found");
  if (!existing.externalId) throw new Error("PO has no external id");

  const client = createProcurementClient(input.actor);
  const remote = await client.rejectPO({
    externalId: existing.externalId,
    approverId: input.actor.id,
    reason: input.reason,
  });

  const [po] = await db.$transaction([
    db.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: remote.status },
    }),
    db.pOApproval.create({
      data: { poId: existing.id, actorId: input.actor.id, decision: "rejected" },
    }),
  ]);

  void appendAuditEvent({
    actorId: input.actor.id,
    actorRole: input.actor.role,
    action: "procurement.rejected",
    resourceType: "purchase_order",
    resourceId: po.id,
    meta: { externalId: existing.externalId, reason: input.reason ?? null },
  });

  if (existing.incident) {
    bus.publish({
      kind: "incident.updated",
      incidentCode: existing.incident.code,
      at: new Date().toISOString(),
    });
  }

  return po;
}
