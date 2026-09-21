import { z } from "zod";

/**
 * Hand-drafted ProcureChain contract. Only the two operations the demo
 * needs — draft + approve. Real ProcureChain likely exposes more (RFQs,
 * vendors, receiving, invoice matching) — add as the spec lands.
 */

export const DraftPOInputSchema = z.object({
  vendor: z.string(),
  itemDescription: z.string(),
  qty: z.number().int().positive(),
  unitCostCents: z.number().int().nonnegative(),
  incidentCode: z.string().optional(),
  requestedById: z.string(),
});

export const POStatusSchema = z.enum(["draft", "pending_approval", "approved", "rejected", "sent"]);

export const DraftPOResultSchema = z.object({
  externalId: z.string(),
  status: POStatusSchema,
  vendor: z.string(),
  itemDescription: z.string(),
  qty: z.number().int(),
  unitCostCents: z.number().int(),
});
export type DraftPOResult = z.infer<typeof DraftPOResultSchema>;

export const ApprovePOResultSchema = z.object({
  externalId: z.string(),
  status: POStatusSchema,
});
export type ApprovePOResult = z.infer<typeof ApprovePOResultSchema>;

export interface ProcurementClient {
  draftPO(input: z.input<typeof DraftPOInputSchema>): Promise<DraftPOResult>;
  approvePO(input: { externalId: string; approverId: string }): Promise<ApprovePOResult>;
  rejectPO(input: { externalId: string; approverId: string; reason?: string }): Promise<ApprovePOResult>;
}
