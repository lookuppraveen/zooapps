import { createHash } from "node:crypto";
import type { RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import { createDashboardClient, dashboardMode } from "@/server/clients/dashboard";
import type { Kpi, SourcedSummary } from "@/server/clients/dashboard/types";
import { appendAuditEvent } from "./audit";

export async function getExecKpis(actor: { id: string; role: RoleKey }): Promise<Kpi[]> {
  const client = createDashboardClient(actor);
  return client.kpis(actor.role);
}

export async function summarizeMostRecent(
  actor: { id: string; role: RoleKey },
): Promise<SourcedSummary | null> {
  const inc = await db.incident.findFirst({ orderBy: { openedAt: "desc" } });
  if (!inc) return null;
  const client = createDashboardClient(actor);
  const summary = await client.summarizeIncident({ incidentId: inc.id, scope: actor.role });
  await db.aiInteraction.create({
    data: {
      kind: "summary",
      model: summary.modelId ?? "dashboard",
      promptHash: createHash("sha1").update(`summary:${inc.id}`).digest("hex"),
      citations: summary.sources as unknown as object[],
      userId: actor.id,
    },
  });
  return summary;
}

export async function askData(
  actor: { id: string; role: RoleKey },
  question: string,
): Promise<{ answer: SourcedSummary; mode: "dashboard" | "local" }> {
  const client = createDashboardClient(actor);
  const answer = await client.askData({ question, scope: actor.role });
  const mode = dashboardMode();
  await db.aiInteraction.create({
    data: {
      kind: "answer",
      model: answer.modelId ?? mode,
      promptHash: createHash("sha1").update(`exec:${actor.role}:${question}`).digest("hex"),
      citations: answer.sources as unknown as object[],
      userId: actor.id,
    },
  });
  void appendAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: "executive.ask",
    resourceType: "dashboard",
    meta: { question, mode },
  });
  return { answer, mode };
}

/**
 * A tiny 30-day incident-volume series for the sparkline card. Bucketed
 * by day, most-recent first, returned oldest→newest for easy plotting.
 */
export async function incidentVolumeSeries(days = 30): Promise<number[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db.$queryRaw<Array<{ day: Date; c: bigint }>>`
    SELECT date_trunc('day', "openedAt") AS day, count(*)::bigint AS c
    FROM incidents
    WHERE "openedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day.toISOString().slice(0, 10), Number(r.c));

  const out: number[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10);
    out.push(byDay.get(key) ?? 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export const EXEC_SUGGESTIONS = [
  { label: "MTTR trend", question: "What's our mean time to resolution?" },
  { label: "Downtime avoided", question: "How much downtime did we avoid this month?" },
  { label: "Open incidents", question: "Any incidents in flight right now?" },
  { label: "Welfare risk", question: "Are there any welfare-affecting escalations?" },
];

export const EXEC_MODE = dashboardMode;
