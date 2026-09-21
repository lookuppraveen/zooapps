import { z } from "zod";
import { router } from "../init";
import { moduleProcedure } from "../init";
import { getHomeKpis } from "@/server/services/kpis";
import { recentAlerts } from "@/server/services/alerts";

const kpiRead = moduleProcedure("home", "read");
const alertRead = moduleProcedure("home", "read");

export const portalRouter = router({
  overview: kpiRead.query(async () => {
    return getHomeKpis();
  }),

  recentAlerts: alertRead
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).default({ limit: 20 }))
    .query(({ input }) => {
      return recentAlerts(input.limit);
    }),
});
