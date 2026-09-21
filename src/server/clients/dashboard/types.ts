import { z } from "zod";
import type { RoleKey } from "@prisma/client";

/**
 * Hand-drafted Dashboard service contract. Two shapes drive the exec
 * screen: a KPI array for the top strip, and a SourcedSummary for
 * natural-language "Ask the data" answers and auto-generated incident
 * summaries.
 */

export const KpiSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string().nullable(),
  displayValue: z.string(),
  hint: z.string().nullable(),
  tone: z.enum(["brand", "healthy", "monitor", "critical", "muted"]).default("muted"),
  deltaPct: z.number().nullable(),
});
export type Kpi = z.infer<typeof KpiSchema>;

export const SourceRefSchema = z.object({
  type: z.enum(["incident", "kpi", "audit", "corpus"]),
  ref: z.string(),
  description: z.string(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const SourcedSummarySchema = z.object({
  headline: z.string(),
  bullets: z.array(z.string()),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      delta: z.string().nullable().optional(),
    }),
  ),
  sources: z.array(SourceRefSchema),
  modelId: z.string().optional(),
});
export type SourcedSummary = z.infer<typeof SourcedSummarySchema>;

export interface DashboardClient {
  kpis(scope: RoleKey): Promise<Kpi[]>;
  askData(input: { question: string; scope: RoleKey }): Promise<SourcedSummary>;
  summarizeIncident(input: { incidentId: string; scope: RoleKey }): Promise<SourcedSummary>;
}
