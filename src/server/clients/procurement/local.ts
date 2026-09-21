import { randomInt } from "node:crypto";
import type { ApprovePOResult, DraftPOResult, ProcurementClient } from "./types";

/**
 * In-process ProcureChain fallback. Generates plausible external PO IDs
 * and echoes state transitions. All persistence happens in the local
 * `purchase_orders` table via ProcurementService — this client only owns
 * the "external" numbering + status machine.
 */
export class LocalProcurementClient implements ProcurementClient {
  private state = new Map<string, DraftPOResult>();

  async draftPO(input: {
    vendor: string;
    itemDescription: string;
    qty: number;
    unitCostCents: number;
  }): Promise<DraftPOResult> {
    const externalId = `PC-${randomInt(10000, 99999)}`;
    const rec: DraftPOResult = {
      externalId,
      status: "pending_approval",
      vendor: input.vendor,
      itemDescription: input.itemDescription,
      qty: input.qty,
      unitCostCents: input.unitCostCents,
    };
    this.state.set(externalId, rec);
    return rec;
  }

  async approvePO(input: { externalId: string }): Promise<ApprovePOResult> {
    const rec = this.state.get(input.externalId);
    if (rec) rec.status = "approved";
    return { externalId: input.externalId, status: "approved" };
  }

  async rejectPO(input: { externalId: string }): Promise<ApprovePOResult> {
    const rec = this.state.get(input.externalId);
    if (rec) rec.status = "rejected";
    return { externalId: input.externalId, status: "rejected" };
  }
}
