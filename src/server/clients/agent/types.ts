import { z } from "zod";
import type { RoleKey } from "@prisma/client";

/**
 * Hand-drafted contract for the Agent Builder service. Regenerate when
 * the real OpenAPI spec lands. The shape follows a common "agent plan"
 * pattern: input = context + retrieved passages; output = ordered steps
 * (numbered narrative for humans) + task suggestions (kanban cards).
 */

export const CitationRefSchema = z.object({
  chunkId: z.string(),
  documentTitle: z.string(),
  section: z.string(),
});
export type CitationRef = z.infer<typeof CitationRefSchema>;

export const PlanStepSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  text: z.string(),
  citations: z.array(CitationRefSchema),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const TaskSuggestionSchema = z.object({
  title: z.string(),
  column: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  order: z.number().int().default(0),
  suggestedRole: z
    .enum(["executive", "facilities_mgr", "curator", "maintenance", "governance", "staff"])
    .optional(),
});
export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>;

export const ResponsePlanSchema = z.object({
  summary: z.string(),
  steps: z.array(PlanStepSchema),
  tasks: z.array(TaskSuggestionSchema),
  suggestedPO: z
    .object({
      vendor: z.string(),
      itemDescription: z.string(),
      qty: z.number().int().positive(),
      unitCostCents: z.number().int().nonnegative(),
    })
    .nullable(),
  modelId: z.string().optional(),
});
export type ResponsePlan = z.infer<typeof ResponsePlanSchema>;

export interface AgentClient {
  planIncidentResponse(input: {
    alert: {
      assetCode: string;
      severity: "warning" | "critical";
      message: string;
      metric?: string;
    };
    context: string; // free-text: asset name, recent maintenance, welfare notes
    roleScope: RoleKey;
  }): Promise<ResponsePlan>;
}
