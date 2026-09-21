import { z } from "zod";
import { router, moduleProcedure } from "../init";
import { getAccessMatrix, governanceKpis, recentAuditEvents } from "@/server/services/security";

const read = moduleProcedure("security", "read");

export const securityRouter = router({
  matrix: read.query(() => getAccessMatrix()),
  kpis: read.query(() => governanceKpis()),
  audit: read
    .input(z.object({ limit: z.number().int().min(10).max(200).default(50) }).default({ limit: 50 }))
    .query(({ input }) => recentAuditEvents(input.limit)),
});
