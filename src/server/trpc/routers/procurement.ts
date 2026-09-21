import { z } from "zod";
import { router, moduleProcedure } from "../init";
import {
  approvePurchaseOrder,
  rejectPurchaseOrder,
} from "@/server/services/procurement";

// PO approval is a Facilities-Manager-and-up capability, gated on
// `incidents` module `act` (matches the seeded matrix).
const act = moduleProcedure("incidents", "act");

export const procurementRouter = router({
  approve: act
    .input(z.object({ poId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      approvePurchaseOrder({
        poId: input.poId,
        actor: { id: ctx.user.id, role: ctx.user.role },
      }),
    ),

  reject: act
    .input(z.object({ poId: z.string().uuid(), reason: z.string().max(500).optional() }))
    .mutation(({ ctx, input }) =>
      rejectPurchaseOrder({
        poId: input.poId,
        reason: input.reason,
        actor: { id: ctx.user.id, role: ctx.user.role },
      }),
    ),
});
