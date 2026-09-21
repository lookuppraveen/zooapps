import { randomInt } from "node:crypto";
import type { IncidentPriority, KanbanColumn, RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import { bus } from "@/server/realtime/sse";
import { createAgentClient } from "@/server/clients/agent";
import { appendAuditEvent } from "./audit";
import { draftPurchaseOrder } from "./procurement";

function newIncidentCode(): string {
  // INC-#### — collision odds are negligible for the demo but callers
  // should retry on P2002 in production.
  return `INC-${randomInt(1000, 9999)}`;
}

export type CreateFromAlertInput = {
  alert: {
    assetCode: string;
    severity: "warning" | "critical";
    message: string;
    metric?: string;
  };
  actor: { id: string; role: RoleKey };
};

/**
 * Open an incident from an alert. Retrieves an AI-assembled response
 * plan (Agent Builder / local fallback), persists the plan steps and
 * suggested tasks, and broadcasts `incident.opened` so every open tab
 * updates without polling.
 *
 * PurchaseOrder creation is deferred to Step 11 (ProcureChain adapter).
 * The `suggestedPO` on the plan is carried on the returned object for
 * the orchestrator to hand off.
 */
export async function createIncidentFromAlert(input: CreateFromAlertInput) {
  const asset = await db.asset.findUnique({ where: { code: input.alert.assetCode } });
  if (!asset) throw new Error(`Unknown asset ${input.alert.assetCode}`);

  const priority: IncidentPriority = input.alert.severity === "critical" ? "critical" : "high";

  // Retrieve context to give the agent (last maintenance record helps the
  // scenario "shaft seal was replaced 2026-05-14" thread).
  const lastMaint = await db.maintenanceRecord.findFirst({
    where: { assetId: asset.id },
    orderBy: { performedAt: "desc" },
  });
  const context = [
    `Asset ${asset.code} (${asset.name}).`,
    lastMaint
      ? `Last maintenance ${lastMaint.performedAt.toISOString().slice(0, 10)}: ${lastMaint.action}. Notes: ${lastMaint.notes ?? "—"}`
      : "No prior maintenance record.",
  ].join(" ");

  const agent = createAgentClient(input.actor);
  const plan = await agent.planIncidentResponse({
    alert: input.alert,
    context,
    roleScope: input.actor.role,
  });

  const code = newIncidentCode();
  const incident = await db.incident.create({
    data: {
      code,
      assetId: asset.id,
      priority,
      status: "triaging",
      summary: plan.summary,
      planSteps: {
        create: plan.steps.map((s) => ({
          ordinal: s.ordinal,
          text: s.text,
          citationIds: s.citations.map((c) => ({
            chunkId: c.chunkId,
            documentTitle: c.documentTitle,
            section: c.section,
          })),
        })),
      },
      tasks: {
        create: plan.tasks.map((t) => ({
          title: t.title,
          column: t.column,
          order: t.order,
          aiGenerated: true,
        })),
      },
    },
    include: { tasks: true, planSteps: true },
  });

  void appendAuditEvent({
    actorId: input.actor.id,
    actorRole: input.actor.role,
    action: "incident.opened",
    resourceType: "incident",
    resourceId: incident.id,
    meta: {
      code: incident.code,
      assetCode: asset.code,
      severity: input.alert.severity,
      stepCount: plan.steps.length,
      taskCount: plan.tasks.length,
    },
  });

  bus.publish({
    kind: "incident.opened",
    incidentCode: incident.code,
    assetCode: asset.code,
    at: new Date().toISOString(),
  });

  // Auto-draft the suggested PO via ProcureChain if the agent proposed
  // one. Draft only — approval still requires a human sign-off (canAct
  // gate on the approve mutation).
  if (plan.suggestedPO) {
    try {
      await draftPurchaseOrder({
        incidentId: incident.id,
        incidentCode: incident.code,
        vendor: plan.suggestedPO.vendor,
        itemDescription: plan.suggestedPO.itemDescription,
        qty: plan.suggestedPO.qty,
        unitCostCents: plan.suggestedPO.unitCostCents,
        actor: input.actor,
      });
    } catch (err) {
      // PO drafting failure should not fail the incident creation.
      console.error("[incidents] auto-draft PO failed:", err);
    }
  }

  return { incident, suggestedPO: plan.suggestedPO ?? null };
}

export async function listIncidents(opts?: { openOnly?: boolean }) {
  return db.incident.findMany({
    where: opts?.openOnly ? { status: { in: ["open", "triaging", "responding"] } } : {},
    include: {
      asset: { select: { code: true, name: true } },
      _count: { select: { tasks: true, planSteps: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });
}

export async function getIncidentByCode(code: string) {
  return db.incident.findUnique({
    where: { code },
    include: {
      asset: { select: { code: true, name: true } },
      tasks: { orderBy: [{ column: "asc" }, { order: "asc" }] },
      planSteps: { orderBy: { ordinal: "asc" } },
      purchaseOrders: { include: { approvals: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function moveTask(input: {
  taskId: string;
  toColumn: KanbanColumn;
  actor: { id: string; role: RoleKey };
}) {
  const task = await db.incidentTask.findUnique({
    where: { id: input.taskId },
    include: { incident: true },
  });
  if (!task) throw new Error("Task not found");

  const updated = await db.incidentTask.update({
    where: { id: task.id },
    data: {
      column: input.toColumn,
      completedAt: input.toColumn === "done" ? new Date() : null,
    },
  });

  // If all tasks are done, mark incident resolved and compute MTTR.
  const remaining = await db.incidentTask.count({
    where: { incidentId: task.incidentId, column: { not: "done" } },
  });
  if (remaining === 0) {
    const openedAt = task.incident.openedAt.getTime();
    const now = Date.now();
    await db.incident.update({
      where: { id: task.incidentId },
      data: {
        status: "resolved",
        closedAt: new Date(now),
        mttrMinutes: Math.max(1, Math.round((now - openedAt) / 60_000)),
      },
    });
  } else if (task.incident.status === "triaging") {
    await db.incident.update({
      where: { id: task.incidentId },
      data: { status: "responding" },
    });
  }

  void appendAuditEvent({
    actorId: input.actor.id,
    actorRole: input.actor.role,
    action: "incident.task.moved",
    resourceType: "incident_task",
    resourceId: task.id,
    meta: { incidentId: task.incidentId, from: task.column, to: input.toColumn },
  });

  bus.publish({
    kind: "incident.updated",
    incidentCode: task.incident.code,
    at: new Date().toISOString(),
  });

  return updated;
}

export async function resetIncidents() {
  await db.pOApproval.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.incidentTask.deleteMany();
  await db.responsePlanStep.deleteMany();
  await db.incident.deleteMany();
}
